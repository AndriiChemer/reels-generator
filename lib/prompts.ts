import { findElementIndex, type SceneElement } from "@/lib/scene-elements";
import type { ReelArtStyle, ReelDraft, ReelScene } from "@/lib/types/reel";

/**
 * All prompt text sent to AI providers is built here, so the scene script
 * stays human-friendly (@mia, #logo) and providers get what they understand.
 */

const MAX_CHARACTER_IMAGES = 2;
const NO_TEXT_RULE =
  "No on-screen text, subtitles, captions, watermarks or UI overlays.";

/**
 * One rendering style for the whole frame. Mixing styles (a stylized head on a
 * photorealistic body) is the most visible failure, so every prompt repeats it.
 */
const ART_STYLE_RULES: Record<ReelArtStyle, string> = {
  reference:
    "Art style: exactly the same as the character reference images — the same rendering, shading, proportions and level of detail. " +
    "Faces, bodies, hands, clothes, props and the room are all in this one style. Do not mix realistic and stylized elements.",
  animated3d:
    "Art style: stylized 3D animated feature film, matching the character reference images — soft shading, expressive faces, slightly stylized proportions. " +
    "Faces, bodies, hands, clothes, props and the room are all in this one style. Nothing photorealistic.",
  photoreal:
    "Art style: photorealistic live-action film still with real people. Nothing stylized or animated.",
};

const NEGATIVE_PROMPT_BASE = [
  "on-screen text, subtitles, captions, watermark",
  "altered face, changed wardrobe, extra people",
  "distorted hands, distorted logo, illegible text, blurry UI",
];

const NEGATIVE_PROMPT_BY_ART_STYLE: Record<ReelArtStyle, string> = {
  reference: "mixed art styles, realistic body with stylized head",
  animated3d: "photorealistic, live action, real skin texture, mixed art styles",
  photoreal: "cartoon, illustration, anime, CGI, 3D render",
};

type ReelLook = Pick<ReelDraft, "artStyle" | "setting" | "style" | "wardrobe">;

export function getVideoNegativePrompt(artStyle: ReelArtStyle = "reference") {
  return [...NEGATIVE_PROMPT_BASE, NEGATIVE_PROMPT_BY_ART_STYLE[artStyle]].join(", ");
}

export type KeyframePrompt = {
  prompt: string;
  /** Images in the same order as "Image 1..N" in the prompt. */
  referenceImagePaths: string[];
};

/** Prompt for the first frame of a scene (image model with references). */
export function buildKeyframePrompt({
  scene,
  reel,
  elements,
  previousKeyframePath,
}: {
  scene: ReelScene;
  reel: ReelLook;
  elements: SceneElement[];
  previousKeyframePath?: string;
}): KeyframePrompt {
  const referenceImagePaths: string[] = [];
  const imageNotes: string[] = [];
  const firstImageNumbers: number[] = [];

  for (const element of elements) {
    const imagePaths =
      element.sign === "@"
        ? element.imagePaths.slice(0, MAX_CHARACTER_IMAGES)
        : element.imagePaths.slice(0, 1);
    const firstImageNumber = referenceImagePaths.length + 1;

    firstImageNumbers.push(firstImageNumber);
    referenceImagePaths.push(...imagePaths);
    imageNotes.push(
      `- ${formatImageNumbers(firstImageNumber, imagePaths.length)}: ${describeElement(element)}`,
    );
  }

  if (previousKeyframePath) {
    referenceImagePaths.push(previousKeyframePath);
    imageNotes.push(
      `- Image ${referenceImagePaths.length}: the previous shot of this film. ${describeContinuity(scene)}`,
    );
  }

  const shotDescription = replaceMentions(
    scene.videoPrompt,
    elements,
    (element, index) => `${element.name} (Image ${firstImageNumbers[index]})`,
  );

  const prompt = [
    `Create the first frame of shot ${scene.order} of a vertical 9:16 short film.\n` +
      "Show the very start of the shot, before the described movement happens.",
    getArtStyleRule(reel),
    `Shot:\n${shotDescription}`,
    imageNotes.length > 0 ? `Reference images:\n${imageNotes.join("\n")}` : "",
    formatLook(reel),
    `Rules: one frame only, no collage, no split screen. One consistent art style for everything in the frame. ${NO_TEXT_RULE}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { prompt, referenceImagePaths };
}

/** Prompt for image-to-video. The keyframe is the first frame. */
export function buildVideoPrompt({
  scene,
  reel,
  elements,
}: {
  scene: ReelScene;
  reel: ReelLook;
  elements: SceneElement[];
}) {
  const action = replaceMentions(
    scene.videoPrompt,
    elements,
    (element, index) => `@Element${index + 1} (${element.name})`,
  );

  return [
    action,
    "",
    "Start exactly from the provided first frame. Keep the same location, lighting, color grade and wardrobe.",
    getArtStyleRule(reel),
    reel.style ? `Visual style: ${reel.style}.` : "",
    "Subtle acting. Smooth, motivated camera movement.",
    NO_TEXT_RULE,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Removes lines that describe the edit, not the picture:
 * duration, transition and on-screen text blocks.
 */
export function cleanSceneDescription(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const keptLines: string[] = [];
  let isInsideTextBlock = false;

  for (const line of lines) {
    if (/^\s*(?:on-screen text|текст на екрані)\s*:/iu.test(line)) {
      isInsideTextBlock = true;
      continue;
    }

    if (isInsideTextBlock) {
      if (line.trim() === "") {
        isInsideTextBlock = false;
      }
      continue;
    }

    if (/^\s*(?:duration|тривалість|transition|перехід|video|відео|clip|кліп)\s*:/iu.test(line)) {
      continue;
    }

    keptLines.push(line);
  }

  return keptLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function replaceMentions(
  text: string,
  elements: SceneElement[],
  format: (element: SceneElement, index: number) => string,
) {
  return text.replace(/([@#])([\p{L}\p{N}_-]+)/gu, (_match, sign, mention) => {
    const index = findElementIndex(elements, sign, mention);

    return index >= 0 ? format(elements[index], index) : mention;
  });
}

function describeElement(element: SceneElement) {
  if (element.sign === "#") {
    return `${element.name} — reproduce it exactly where the shot mentions it; keep shapes, colors and layout.`;
  }

  const appearance = element.appearance ? ` (${element.appearance})` : "";

  return `${element.name}${appearance} — keep the exact face, hairstyle, skin tone, age, body type and art style. Clothes follow the wardrobe below.`;
}

function describeContinuity(scene: ReelScene) {
  const base =
    "Keep the same place, furniture, lighting, color grade and wardrobe.";

  return scene.transition === "continue"
    ? `${base} This shot continues it without a cut: the same moment, only the camera has moved as described.`
    : `${base} Show a new camera angle as described.`;
}

function getArtStyleRule(reel: ReelLook) {
  return ART_STYLE_RULES[reel.artStyle ?? "reference"];
}

function formatLook(reel: ReelLook) {
  const lines = [
    reel.setting ? `- Location: ${reel.setting}` : "",
    reel.wardrobe ? `- Wardrobe: ${reel.wardrobe}` : "",
    reel.style ? `- Visual style: ${reel.style}` : "",
  ].filter(Boolean);

  return lines.length > 0
    ? ["Same in every shot of this film:", ...lines].join("\n")
    : "";
}

function formatImageNumbers(firstNumber: number, count: number) {
  return count > 1
    ? `Images ${firstNumber}–${firstNumber + count - 1}`
    : `Image ${firstNumber}`;
}
