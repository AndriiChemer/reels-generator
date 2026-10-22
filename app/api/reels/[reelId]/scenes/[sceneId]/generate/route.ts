import { getVideoProvider } from "@/lib/ai/video-providers";
import { listCharacters } from "@/lib/characters";
import {
  createFailedGeneration,
  createGenerationFromResult,
  upsertGeneration,
  withGenerationLog,
} from "@/lib/generations";
import { downloadSceneVideo } from "@/lib/files/media";
import { buildVideoPrompt, getVideoNegativePrompt } from "@/lib/prompts";
import { listReferenceAssets } from "@/lib/references";
import { readReelDraft } from "@/lib/reels";
import { resolveSceneElements } from "@/lib/scene-elements";
import {
  findNextScene,
  findReelScene,
  readReelScenes,
  updateReelScene,
  updateReelSceneStatus,
} from "@/lib/scenes";
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

  if (scene.clipName) {
    return jsonError("Ця сцена використовує готовий кліп — генерація не потрібна.", 422);
  }

  if (!scene.keyframe) {
    return jsonError("Спершу згенеруй кадр сцени — з нього стартує відео.", 422);
  }

  const keyframe = scene.keyframe;

  try {
    const [reel, characters, referenceAssets] = await Promise.all([
      readReelDraft(reelId),
      listCharacters(),
      listReferenceAssets(),
    ]);

    const elements = resolveSceneElements(scene, characters, referenceAssets);
    const nextScene = findNextScene(scenesDocument, scene);
    // A "continue" transition means the next shot starts where this one ends,
    // so this video should end on the next scene keyframe.
    const endImagePath =
      nextScene?.transition === "continue"
        ? nextScene.keyframe?.outputPath
        : undefined;

    const provider = getVideoProvider();
    const result = await provider.generateVideo({
      prompt: buildVideoPrompt({ scene, reel: reel ?? {}, elements }),
      negativePrompt: getVideoNegativePrompt(reel?.artStyle),
      durationSeconds: scene.durationSeconds,
      aspectRatio: "9:16",
      startImagePath: keyframe.outputPath,
      endImagePath,
      referenceSets: elements.map((element) => ({
        label: element.name,
        imagePaths: element.imagePaths,
      })),
    });

    await updateReelScene(reelId, sceneId, {
      videoKeyframeVersion: keyframe.generatedAt,
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
      ? withGenerationLog(
          { ...generation, outputPath },
          "MP4 збережено локально. Сцена готова.",
        )
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
