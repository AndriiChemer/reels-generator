import { getImageProvider } from "@/lib/ai/image-providers";
import { listCharacters } from "@/lib/characters";
import { downloadSceneKeyframe } from "@/lib/files/media";
import { buildKeyframePrompt } from "@/lib/prompts";
import { listReferenceAssets } from "@/lib/references";
import { readReelDraft } from "@/lib/reels";
import { resolveSceneElements } from "@/lib/scene-elements";
import { getLookVersion } from "@/lib/scene-status";
import {
  findPreviousScene,
  findReelScene,
  readReelScenes,
  updateReelSceneKeyframe,
} from "@/lib/scenes";
import type { SceneKeyframe } from "@/lib/types/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Generates the first frame of a scene. It uses character photos, #references
 * and the previous scene keyframe, so every shot happens in the same world.
 */
export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const [reel, scenesDocument, characters, referenceAssets] = await Promise.all([
    readReelDraft(reelId),
    readReelScenes(reelId),
    listCharacters(),
    listReferenceAssets(),
  ]);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!reel || !scene) {
    return jsonError("Сцену не знайдено.", 404);
  }

  if (scene.clipName) {
    return jsonError("Ця сцена використовує готовий кліп — кадр не потрібен.", 422);
  }

  const previousKeyframe = findPreviousScene(scenesDocument, scene)?.keyframe;

  try {
    const { prompt, referenceImagePaths } = buildKeyframePrompt({
      scene,
      reel,
      elements: resolveSceneElements(scene, characters, referenceAssets),
      previousKeyframePath: previousKeyframe?.outputPath,
    });
    const result = await getImageProvider().generateImage({
      prompt,
      aspectRatio: "9:16",
      referenceImagePaths,
    });
    const outputPath = await downloadSceneKeyframe({
      reelId,
      sceneId,
      imageUrl: result.imageUrl,
    });
    const keyframe: SceneKeyframe = {
      provider: result.provider,
      model: result.model,
      outputPath,
      prompt,
      previousKeyframeVersion: previousKeyframe?.generatedAt,
      lookVersion: getLookVersion(reel),
      estimatedCostUsd: result.estimatedCostUsd,
      generatedAt: new Date().toISOString(),
    };

    await updateReelSceneKeyframe(reelId, sceneId, keyframe);

    return Response.json({ keyframe }, { status: 201 });
  } catch (error) {
    return jsonError(readErrorMessage(error), 502);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Image provider error.";
}
