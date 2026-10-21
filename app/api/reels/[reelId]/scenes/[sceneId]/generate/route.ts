import { getVideoProvider } from "@/lib/ai/video-providers";
import { listCharacters } from "@/lib/characters";
import {
  createFailedGeneration,
  createGenerationFromResult,
  upsertGeneration,
  withGenerationLog,
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
    const characters = await listCharacters();
    const characterReferences = scene.characterIds.flatMap((characterId) => {
      const character = characters.find(({ id }) => id === characterId);
      const imagePaths = character?.referenceImages.filter(Boolean) || [];

      return imagePaths.length > 0
        ? [{ label: `персонаж ${character?.name || characterId}`, imagePaths }]
        : [];
    });
    const assetReferences = scene.referencePaths.map((referencePath, index) => ({
      label: `референс #${scene.referenceNames[index] || referenceNameFromPath(referencePath)}`,
      imagePaths: [referencePath],
    }));
    const referenceSets = [...characterReferences, ...assetReferences];
    const startImagePath =
      assetReferences[0]?.imagePaths[0] || characterReferences[0]?.imagePaths[0];

    if (!startImagePath) {
      throw new Error(
        "Для генерації з максимальною схожістю додай @персонажа або #референс із картинкою.",
      );
    }

    const provider = getVideoProvider();
    const result = await provider.generateVideo({
      prompt: scene.videoPrompt || scene.rawText,
      durationSeconds: scene.durationSeconds,
      aspectRatio: "9:16",
      startImagePath,
      referenceSets,
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

function referenceNameFromPath(referencePath: string) {
  const filename = referencePath.split("/").at(-1) || "reference";

  return filename.replace(/\.[^.]+$/, "");
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Provider error.";
}
