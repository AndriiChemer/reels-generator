import { getVideoProvider } from "@/lib/ai/video-providers";
import {
  createFailedGeneration,
  createGenerationFromResult,
  upsertGeneration,
} from "@/lib/generations";
import { downloadSceneVideo } from "@/lib/files/media";
import { findReelScene, readReelScenes, updateReelSceneStatus } from "@/lib/scenes";
import type { GenerationMetadata } from "@/lib/types/generation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const scenesDocument = await readReelScenes(reelId);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!scenesDocument || !scene) {
    return jsonError("Сцену не знайдено. Спершу збережи блок сцен.", 404);
  }

  try {
    const provider = getVideoProvider();
    const result = await provider.generateVideo({
      prompt: scene.videoPrompt || scene.rawText,
      durationSeconds: scene.durationSeconds,
      aspectRatio: "9:16",
      assetReferencePaths: scene.referencePaths,
    });
    const generation = createGenerationFromResult({
      reelId,
      result,
      scene,
    });
    const outputPath =
      generation.status === "completed" && generation.temporaryVideoUrl
        ? await downloadSceneVideo({
            reelId,
            sceneId,
            temporaryVideoUrl: generation.temporaryVideoUrl,
          })
        : undefined;
    const completedGeneration: GenerationMetadata = outputPath
      ? {
          ...generation,
          outputPath,
        }
      : generation;

    await Promise.all([
      upsertGeneration(completedGeneration),
      updateReelSceneStatus(
        reelId,
        sceneId,
        completedGeneration.status,
        completedGeneration.outputPath,
      ),
    ]);

    return Response.json({ generation: completedGeneration }, { status: 202 });
  } catch (error) {
    const generation = createFailedGeneration({
      errorMessage: readErrorMessage(error),
      reelId,
      scene,
    });

    await Promise.all([
      upsertGeneration(generation),
      updateReelSceneStatus(reelId, sceneId, "failed"),
    ]);

    return Response.json({ generation, error: generation.errorMessage }, { status: 502 });
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Provider error.";
}
