import path from "node:path";
import { findClip, listClipAssets, type ClipAsset } from "@/lib/clips";
import { prepareClipForScene } from "@/lib/ffmpeg/prepareClip";
import { readJsonFile, updateJsonFile, writeJsonFile } from "@/lib/files/json";
import { getSceneOutputPath, toOutputRelativePath } from "@/lib/files/media";
import { cleanSceneDescription } from "@/lib/prompts";
import { findReferencePath, type ReferenceAsset } from "@/lib/references";
import {
  getReelDirectoryPath,
  readReelDraft,
  sanitizeReelId,
} from "@/lib/reels";
import { normalizeMention } from "@/lib/scene-elements";
import type { Character } from "@/lib/types/character";
import type { GenerationStatus } from "@/lib/types/generation";
import type {
  ReelScene,
  ReelScenesDocument,
  SceneAudioOutput,
  SceneKeyframe,
  SceneTransition,
  SceneVoiceoverOutput,
} from "@/lib/types/reel";

const SCENES_FILE_NAME = "scenes.json";
const DEFAULT_SCENE_DURATION_SECONDS = 4;

export type SceneWarning = {
  sceneId: string;
  sceneOrder: number;
  unknownCharacterNames: string[];
  unknownReferenceNames: string[];
};

export async function readReelScenes(reelId: string) {
  return readJsonFile<ReelScenesDocument>(getReelScenesFilePath(reelId));
}

export function findReelScene(
  scenesDocument: ReelScenesDocument | null,
  sceneId: string,
) {
  return scenesDocument?.scenes.find((scene) => scene.id === sceneId) ?? null;
}

/** The scene right before this one, if any. */
export function findPreviousScene(
  scenesDocument: ReelScenesDocument | null,
  scene: ReelScene,
) {
  return (
    scenesDocument?.scenes.find(({ order }) => order === scene.order - 1) ?? null
  );
}

/** The scene right after this one, if any. */
export function findNextScene(
  scenesDocument: ReelScenesDocument | null,
  scene: ReelScene,
) {
  return (
    scenesDocument?.scenes.find(({ order }) => order === scene.order + 1) ?? null
  );
}

/**
 * Parses the script into scenes. Generated media stays where its part of the
 * scene did not change (see keepGeneratedMedia).
 */
export async function saveReelScenes(
  reelId: string,
  sourceText: string,
  characters: Character[],
  referenceAssets: ReferenceAsset[],
) {
  const reel = await readReelDraft(reelId);

  if (!reel) {
    throw new Error("Reel draft does not exist.");
  }

  const normalizedText = sourceText.replace(/\r\n/g, "\n").trim();
  const [previousDocument, clips] = await Promise.all([
    readReelScenes(reelId),
    listClipAssets(),
  ]);
  const scenes = await Promise.all(
    parseManualScenes(normalizedText, characters, referenceAssets)
      .map((scene) => keepGeneratedMedia(scene, previousDocument))
      .map((scene) => attachClip(reelId, scene, clips)),
  );
  const document: ReelScenesDocument = {
    sourceText: normalizedText,
    scenes,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(getReelScenesFilePath(reelId), document);

  return document;
}

export function getSceneWarnings(
  scenesDocument: ReelScenesDocument | null,
  characters: Character[],
  referenceAssets: ReferenceAsset[],
) {
  if (!scenesDocument) {
    return [];
  }

  const knownCharacterNames = new Set(
    characters.map((character) => normalizeMention(character.name)),
  );
  const knownReferenceNames = new Set(
    referenceAssets.map((referenceAsset) => normalizeMention(referenceAsset.name)),
  );

  return scenesDocument.scenes
    .map(
      (scene): SceneWarning => ({
        sceneId: scene.id,
        sceneOrder: scene.order,
        unknownCharacterNames: scene.characterNames.filter(
          (name) => !knownCharacterNames.has(normalizeMention(name)),
        ),
        unknownReferenceNames: scene.referenceNames.filter(
          (name) => !knownReferenceNames.has(normalizeMention(name)),
        ),
      }),
    )
    .filter(
      (warning) =>
        warning.unknownCharacterNames.length > 0 ||
        warning.unknownReferenceNames.length > 0,
    );
}

/**
 * Updates one scene inside scenes.json. Returns the updated scene or null if
 * the scene does not exist.
 */
export async function updateReelScene(
  reelId: string,
  sceneId: string,
  patch: Partial<ReelScene> | ((scene: ReelScene) => Partial<ReelScene>),
) {
  let updatedScene: ReelScene | null = null;

  await updateJsonFile<ReelScenesDocument>(
    getReelScenesFilePath(reelId),
    (document) => {
      if (!document) {
        throw new Error("Сцени для цього Reel ще не збережені.");
      }

      return {
        ...document,
        scenes: document.scenes.map((scene) => {
          if (scene.id !== sceneId) {
            return scene;
          }

          const changes = typeof patch === "function" ? patch(scene) : patch;
          updatedScene = { ...scene, ...changes };

          return updatedScene;
        }),
        updatedAt: new Date().toISOString(),
      };
    },
  );

  return updatedScene as ReelScene | null;
}

export function updateReelSceneStatus(
  reelId: string,
  sceneId: string,
  status: GenerationStatus,
  outputPath?: string,
) {
  return updateReelScene(reelId, sceneId, (scene) => ({
    status,
    outputPath: outputPath ?? scene.outputPath,
  }));
}

export function updateReelSceneKeyframe(
  reelId: string,
  sceneId: string,
  keyframe: SceneKeyframe,
) {
  return updateReelScene(reelId, sceneId, { keyframe });
}

export function updateReelSceneAudio(
  reelId: string,
  sceneId: string,
  audioOutput: SceneAudioOutput,
) {
  return updateReelScene(reelId, sceneId, { audioOutput });
}

export function updateReelSceneVoiceover(
  reelId: string,
  sceneId: string,
  voiceoverOutput: SceneVoiceoverOutput,
) {
  return updateReelScene(reelId, sceneId, { voiceoverOutput });
}

export function updateReelScenePreview(
  reelId: string,
  sceneId: string,
  preview: { outputPath?: string; error?: string },
) {
  return updateReelScene(reelId, sceneId, (scene) => ({
    previewOutputPath: preview.outputPath ?? scene.previewOutputPath,
    previewRenderedAt: preview.outputPath
      ? new Date().toISOString()
      : scene.previewRenderedAt,
    previewRenderError: preview.error,
  }));
}

export type SceneVoiceoverCue = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

export function getSceneVoiceoverCue(
  scene: ReelScene,
): SceneVoiceoverCue | null {
  const sourceText = scene.audioPlan.rawText || scene.audioPlan.voicePrompt || "";
  const match = sourceText.match(
    /(?:^|\n)\s*[-*•]?\s*(?:voiceover|narrator|голос(?:\s+за\s+кадром)?|озвучення)\s*(?:(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?))?\s*:\s*[“"']?(.+?)[”"']?\s*$/imu,
  );

  if (!match) {
    return null;
  }

  const text = match[3]?.trim();

  if (!text) {
    return null;
  }

  const toSceneTime = createSceneTimeConverter(scene);
  const startSeconds = clampCueTime(
    toSceneTime(parseCueTime(match[1]) ?? 0),
    scene.durationSeconds,
  );
  const requestedEndSeconds = match[2]
    ? toSceneTime(parseCueTime(match[2]) ?? scene.durationSeconds)
    : scene.durationSeconds;
  const endSeconds = Math.max(
    startSeconds,
    clampCueTime(requestedEndSeconds, scene.durationSeconds),
  );

  return { text, startSeconds, endSeconds };
}

export function getReelScenesFilePath(reelId: string) {
  const safeReelId = sanitizeReelId(reelId);
  const filePath = path.join(
    getReelDirectoryPath(safeReelId),
    SCENES_FILE_NAME,
  );

  return filePath;
}

function parseManualScenes(
  sourceText: string,
  characters: Character[],
  referenceAssets: ReferenceAsset[],
) {
  let timelineStartSeconds = 0;

  return splitSceneBlocks(sourceText).map((rawText, index): ReelScene => {
    const { audioText, videoText } = splitAudioSection(rawText);
    const durationSeconds = parseDurationSeconds(rawText);
    const characterNames = uniqueValues(extractCharacterMentions(rawText));
    const clipName = parseClipName(rawText);
    const referenceNames = uniqueValues(extractReferenceMentions(rawText)).filter(
      (name) => name.toLowerCase() !== clipName,
    );
    const scene: ReelScene = {
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      rawText,
      durationSeconds,
      timelineStartSeconds,
      transition: parseTransition(rawText),
      clipName,
      videoPrompt: cleanSceneDescription(videoText),
      audioPlan: buildSceneAudioPlan({
        audioText,
        durationSeconds,
        timelineStartSeconds,
        videoText,
      }),
      characterNames,
      characterIds: resolveCharacterIds(characterNames, characters),
      referenceNames,
      referencePaths: referenceNames
        .map((referenceName) => findReferencePath(referenceName, referenceAssets))
        .filter((referencePath): referencePath is string =>
          Boolean(referencePath),
        ),
      status: "draft",
    };

    timelineStartSeconds += durationSeconds;

    return scene;
  });
}

/**
 * Keeps what is still valid after the script was edited, part by part:
 * editing the "Звук" block must not throw away a paid video, and editing
 * the picture must not throw away the voice.
 */
/**
 * Adds or replaces the "Відео: #name" line of one scene in the script.
 * The script stays the single source of truth for which scene uses a clip.
 */
export function setSceneClipInScript(
  sourceText: string,
  scene: ReelScene,
  clipName: string,
) {
  const normalizedText = sourceText.replace(/\r\n/g, "\n");
  const blockStart = normalizedText.indexOf(scene.rawText);

  if (blockStart < 0) {
    throw new Error("Не вдалося знайти сцену в сценарії. Збережи сценарій і спробуй ще раз.");
  }

  const blockWithoutClip = scene.rawText.replace(CLIP_LINE_PATTERN, "").trim();
  const nextBlock = `Відео: #${clipName}\n${blockWithoutClip}`;

  return (
    normalizedText.slice(0, blockStart) +
    nextBlock +
    normalizedText.slice(blockStart + scene.rawText.length)
  );
}

const CLIP_LINE_PATTERN = /^\s*(?:відео|video|clip|кліп)\s*:\s*#([a-z0-9_-]+)\s*$\n?/imu;

function parseClipName(rawText: string) {
  return rawText.match(CLIP_LINE_PATTERN)?.[1]?.toLowerCase();
}

/**
 * A scene with "Відео: #name" gets the library clip as its video, trimmed to
 * the scene length. If the clip is missing, the scene stays a draft.
 */
async function attachClip(
  reelId: string,
  scene: ReelScene,
  clips: ClipAsset[],
): Promise<ReelScene> {
  if (!scene.clipName) {
    return scene.videoSource === "clip"
      ? { ...scene, status: "draft", outputPath: undefined, videoSource: undefined }
      : scene;
  }

  const clip = findClip(scene.clipName, clips);

  if (!clip) {
    return { ...scene, status: "draft", outputPath: undefined, videoSource: undefined };
  }

  const outputPath = getSceneOutputPath(reelId, scene.id);

  await prepareClipForScene({
    inputPath: clip.filePath,
    outputPath,
    durationSeconds: scene.durationSeconds,
  });

  return {
    ...scene,
    status: "completed",
    outputPath: toOutputRelativePath(outputPath),
    videoSource: "clip",
    keyframe: undefined,
    videoKeyframeVersion: undefined,
  };
}

function keepGeneratedMedia(
  scene: ReelScene,
  previousDocument: ReelScenesDocument | null,
): ReelScene {
  const previous = previousDocument?.scenes.find(({ id }) => id === scene.id);

  if (!previous) {
    return scene;
  }

  const isSamePicture =
    previous.videoPrompt === scene.videoPrompt &&
    previous.durationSeconds === scene.durationSeconds &&
    (previous.transition ?? "cut") === scene.transition &&
    previous.characterIds.join() === scene.characterIds.join() &&
    previous.referencePaths.join() === scene.referencePaths.join();
  const isSameVoice = previous.audioPlan.voicePrompt === scene.audioPlan.voicePrompt;
  const isSameSoundEffects =
    previous.durationSeconds === scene.durationSeconds &&
    JSON.stringify(previous.audioPlan.sfx) === JSON.stringify(scene.audioPlan.sfx);
  const isSameScene = isSamePicture && isSameVoice && isSameSoundEffects;

  return {
    ...scene,
    ...(isSamePicture && {
      status: previous.status,
      keyframe: previous.keyframe,
      outputPath: previous.outputPath,
      videoKeyframeVersion: previous.videoKeyframeVersion,
      videoSource: previous.videoSource,
    }),
    ...(isSameVoice && { voiceoverOutput: previous.voiceoverOutput }),
    ...(isSameSoundEffects && { audioOutput: previous.audioOutput }),
    ...(isSameScene && {
      previewOutputPath: previous.previewOutputPath,
      previewRenderedAt: previous.previewRenderedAt,
      previewRenderError: previous.previewRenderError,
    }),
  };
}

function parseTransition(rawText: string): SceneTransition {
  const match = rawText.match(/^\s*(?:transition|перехід)\s*:\s*(.+)$/imu);

  return match && /(continue|seamless|продовж|без\s+склейки)/iu.test(match[1])
    ? "continue"
    : "cut";
}

/**
 * Scripts often use reel time ("8.2–11.8") instead of scene time
 * ("0.2–3.8"). Converts reel time to scene time when it is clearly reel time.
 */
function createSceneTimeConverter(
  scene: Pick<ReelScene, "durationSeconds" | "timelineStartSeconds">,
) {
  const offset = scene.timelineStartSeconds ?? 0;

  return (seconds: number) =>
    offset > 0 && seconds >= offset && seconds > scene.durationSeconds
      ? Math.round((seconds - offset) * 100) / 100
      : seconds;
}

function splitAudioSection(rawText: string) {
  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const audioHeaderIndex = lines.findIndex((line) =>
    /^\s*(?:звук|аудіо|audio|sound)\s*:?\s*(.*)$/iu.test(line),
  );

  if (audioHeaderIndex < 0) {
    return {
      audioText: "",
      videoText: rawText.trim(),
    };
  }

  const audioHeaderMatch = lines[audioHeaderIndex].match(
    /^\s*(?:звук|аудіо|audio|sound)\s*:?\s*(.*)$/iu,
  );
  const audioLines = [
    audioHeaderMatch?.[1] ?? "",
    ...lines.slice(audioHeaderIndex + 1),
  ];

  return {
    audioText: audioLines.join("\n").trim(),
    videoText: lines.slice(0, audioHeaderIndex).join("\n").trim(),
  };
}

function buildSceneAudioPlan({
  audioText,
  durationSeconds,
  timelineStartSeconds,
  videoText,
}: {
  audioText: string;
  durationSeconds: number;
  timelineStartSeconds: number;
  videoText: string;
}): ReelScene["audioPlan"] {
  const trimmedAudioText = audioText.trim();

  if (!trimmedAudioText) {
    const speechPolicy = detectSpeechPolicy(videoText);

    return {
      source: "auto",
      prompt: buildAutomaticAudioPrompt(
        cleanSceneDescription(videoText),
        durationSeconds,
        speechPolicy,
      ),
      durationSeconds,
      speechPolicy,
      ambiencePrompt: "натуральна атмосфера сцени без різких шумів",
      musicPrompt: "легка фонова музика, що не перекриває дію",
      sfx: [],
    };
  }

  const toSceneTime = createSceneTimeConverter({
    durationSeconds,
    timelineStartSeconds,
  });
  const cues = parseAudioCues(trimmedAudioText).map((cue) => ({
    ...cue,
    startSeconds:
      cue.startSeconds === undefined ? undefined : toSceneTime(cue.startSeconds),
    endSeconds:
      cue.endSeconds === undefined ? undefined : toSceneTime(cue.endSeconds),
  }));
  const speechPolicy = detectSpeechPolicy(trimmedAudioText);
  const ambiencePrompt = joinCueDescriptions(
    cues.filter((cue) => isAmbienceCue(cue.description)),
  );
  const musicPrompt = joinCueDescriptions(
    cues.filter((cue) => isMusicCue(cue.description)),
  );
  const voicePrompt = joinCueDescriptions(
    cues.filter((cue) => isVoiceCue(cue.description)),
  );
  const sfx = cues.filter(
    (cue) =>
      !isAmbienceCue(cue.description) &&
      !isMusicCue(cue.description) &&
      !isVoiceCue(cue.description) &&
      !isNoSpeechCue(cue.description),
  );

  return {
    source: "explicit",
    prompt: buildExplicitAudioPrompt(trimmedAudioText, durationSeconds),
    durationSeconds,
    speechPolicy,
    ambiencePrompt: ambiencePrompt || undefined,
    musicPrompt: musicPrompt || undefined,
    voicePrompt: voicePrompt || undefined,
    sfx,
    rawText: trimmedAudioText,
  };
}

function parseAudioCues(audioText: string) {
  return audioText
    .split("\n")
    .map((line) => parseAudioCue(line))
    .filter((cue): cue is NonNullable<ReturnType<typeof parseAudioCue>> =>
      Boolean(cue),
    );
}

function parseAudioCue(line: string) {
  const cleanedLine = line
    .trim()
    .replace(/^[-*•]\s*/, "")
    .trim();

  if (!cleanedLine) {
    return null;
  }

  const timedCueMatch = cleanedLine.match(
    /^(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*:?\s*(.+)$/u,
  );

  if (!timedCueMatch) {
    return {
      description: cleanedLine,
    };
  }

  return {
    description: timedCueMatch[3].trim(),
    startSeconds: Number.parseFloat(timedCueMatch[1].replace(",", ".")),
    endSeconds: Number.parseFloat(timedCueMatch[2].replace(",", ".")),
  };
}

function parseCueTime(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampCueTime(value: number, sceneDurationSeconds: number) {
  return Math.min(Math.max(value, 0), sceneDurationSeconds);
}

function buildAutomaticAudioPrompt(
  videoText: string,
  durationSeconds: number,
  speechPolicy: ReelScene["audioPlan"]["speechPolicy"],
) {
  const speechInstruction =
    speechPolicy === "dialogue_expected"
      ? "Діалог або голос буде окремим TTS-шаром; тут створи лише ambience, foley і тиху музику."
      : "Без мовлення, без голосу і без вокалу.";

  return [
    `Створи цілісний audio bed на ${durationSeconds} секунд для вертикального Reel.`,
    `Візуальна дія: ${compactPromptText(videoText)}.`,
    "Додай натуральну атмосферу, синхронні foley/SFX і м'яку фонову музику.",
    speechInstruction,
  ].join(" ");
}

function buildExplicitAudioPrompt(audioText: string, durationSeconds: number) {
  return [
    `Створи цілісний audio bed на ${durationSeconds} секунд для вертикального Reel.`,
    "Дотримуйся цього audio plan:",
    compactPromptText(audioText),
  ].join(" ");
}

function detectSpeechPolicy(text: string): ReelScene["audioPlan"]["speechPolicy"] {
  if (/\b(?:no speech|no voice|without speech)\b/iu.test(text)) {
    return "no_speech";
  }

  if (/(?:без\s+мовлення|без\s+голосу|голосу\s+немає|без\s+діалогу)/iu.test(text)) {
    return "no_speech";
  }

  if (/(?:говорить|каже|сказав|сказала|діалог|реплік|voice|speech|dialogue)/iu.test(text)) {
    return "dialogue_expected";
  }

  if (/[«"].+[»"]/u.test(text)) {
    return "dialogue_expected";
  }

  return "no_speech";
}

function joinCueDescriptions(cues: ReelScene["audioPlan"]["sfx"]) {
  return cues.map((cue) => cue.description).join("; ");
}

function isAmbienceCue(description: string) {
  return /(ambien|атмосфер|кімнат|вулиц|шум|дощ|вітер|кафе|кухн)/iu.test(
    description,
  );
}

function isMusicCue(description: string) {
  return /(music|bgm|melody|музик|мелод|саундтрек|фонова)/iu.test(description);
}

/** A line someone speaks. "No voice" / "без голосу" is an instruction, not a line. */
function isVoiceCue(description: string) {
  return (
    !isNoSpeechCue(description) &&
    /(voice|speech|dialogue|голос|мовлен|діалог|реплік|говорить|каже)/iu.test(description)
  );
}

function isNoSpeechCue(description: string) {
  return /(без\s+мовлення|без\s+голосу|голосу\s+немає|без\s+діалогу|no speech|no voice)/iu.test(
    description,
  );
}

function compactPromptText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function splitSceneBlocks(sourceText: string) {
  const normalizedText = sourceText.replace(/\r\n/g, "\n").trim();

  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText.split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let hasExplicitSceneHeaders = false;

  for (const line of lines) {
    const headerMatch = line.match(
      /^\s*(?:сцена\s*\d+|scene\s*\d+|\d+\.)\s*:?\s*(.*)$/iu,
    );

    if (headerMatch) {
      hasExplicitSceneHeaders = true;

      pushSceneBlock(blocks, currentBlock);
      currentBlock = headerMatch[1] ? [headerMatch[1]] : [];
      continue;
    }

    currentBlock.push(line);
  }

  pushSceneBlock(blocks, currentBlock);

  if (hasExplicitSceneHeaders) {
    return blocks;
  }

  return normalizedText
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function pushSceneBlock(blocks: string[], blockLines: string[]) {
  const block = blockLines.join("\n").trim();

  if (block) {
    blocks.push(block);
  }
}

function extractCharacterMentions(rawText: string) {
  return Array.from(rawText.matchAll(/@([\p{L}\p{N}_-]+)/gu)).map(
    (match) => match[1],
  );
}

function extractReferenceMentions(rawText: string) {
  return Array.from(rawText.matchAll(/#([a-z0-9][a-z0-9_-]*)/giu)).map(
    (match) => match[1],
  );
}

function resolveCharacterIds(characterNames: string[], characters: Character[]) {
  return characterNames
    .map((characterName) => {
      const character = characters.find(
        (candidate) =>
          normalizeMention(candidate.name) === normalizeMention(characterName),
      );

      return character?.id;
    })
    .filter((characterId): characterId is string => Boolean(characterId));
}

function parseDurationSeconds(rawText: string) {
  const durationMatch =
    rawText.match(/(?:duration|тривалість)\s*:\s*(\d+(?:[.,]\d+)?)/iu) ??
    rawText.match(
      /(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?|сек|секунд[аи]?)(?!\p{L})/iu,
    );

  if (!durationMatch) {
    return DEFAULT_SCENE_DURATION_SECONDS;
  }

  const duration = Number.parseFloat(durationMatch[1].replace(",", "."));

  if (!Number.isFinite(duration) || duration <= 0) {
    return DEFAULT_SCENE_DURATION_SECONDS;
  }

  return duration;
}

function uniqueValues(values: string[]) {
  const seenValues = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeMention(value);

    if (seenValues.has(normalizedValue)) {
      return false;
    }

    seenValues.add(normalizedValue);
    return true;
  });
}
