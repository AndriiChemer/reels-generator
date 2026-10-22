import { readReelDraft } from "@/lib/reels";
import { getLookVersion } from "@/lib/scene-status";
import {
  findPreviousScene,
  findReelScene,
  readReelScenes,
  updateReelScene,
} from "@/lib/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Keeps the current keyframe as it is: marks it up to date with the current
 * reel look and the current previous keyframe, without generating anything.
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
  const [reel, scenesDocument] = await Promise.all([
    readReelDraft(reelId),
    readReelScenes(reelId),
  ]);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!reel || !scene?.keyframe) {
    return Response.json({ error: "Кадр сцени не знайдено." }, { status: 404 });
  }

  const keyframe = {
    ...scene.keyframe,
    lookVersion: getLookVersion(reel),
    previousKeyframeVersion: findPreviousScene(scenesDocument, scene)?.keyframe
      ?.generatedAt,
  };

  await updateReelScene(reelId, sceneId, { keyframe });

  return Response.json({ keyframe });
}
