import type { ReelDraft, ReelScene } from "@/lib/types/reel";

type ReelLook = Pick<ReelDraft, "artStyle" | "setting" | "style" | "wardrobe">;

/**
 * Pure helpers about scene progress. No Node imports, so the browser can use
 * them too.
 */

/** Short fingerprint of the reel look, stored with every keyframe. */
export function getLookVersion(reel: ReelLook) {
  const text = [reel.artStyle ?? "reference", reel.setting, reel.style, reel.wardrobe]
    .map((value) => value ?? "")
    .join("|");
  let hash = 5381;

  for (const character of text) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }

  return (hash >>> 0).toString(36);
}

/**
 * Why a keyframe should be made again, or null when it is up to date:
 * the reel look changed, or the previous scene got a new keyframe.
 */
export function getKeyframeOutdatedReason(
  scene: ReelScene,
  previousScene: ReelScene | undefined,
  reel: ReelLook,
) {
  if (!scene.keyframe) {
    return null;
  }

  if (scene.keyframe.lookVersion !== getLookVersion(reel)) {
    return "look";
  }

  if (
    previousScene &&
    scene.keyframe.previousKeyframeVersion !== previousScene.keyframe?.generatedAt
  ) {
    return "previous";
  }

  return null;
}

/** True when the video was generated from an older keyframe. */
export function isVideoOutdated(scene: ReelScene) {
  return Boolean(
    scene.outputPath &&
      scene.keyframe &&
      scene.videoKeyframeVersion !== scene.keyframe.generatedAt,
  );
}

export function hasVideo(scene: ReelScene) {
  return scene.status === "completed" && Boolean(scene.outputPath);
}

export function isVideoInProgress(scene: ReelScene) {
  return scene.status === "queued" || scene.status === "processing";
}

export function getReelDurationSeconds(scenes: ReelScene[]) {
  return scenes.reduce((total, scene) => total + scene.durationSeconds, 0);
}
