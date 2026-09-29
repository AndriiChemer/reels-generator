import path from "node:path";
import { readJsonFile, writeJsonFile } from "@/lib/files/json";
import { findReferencePath, type ReferenceAsset } from "@/lib/references";
import {
  getReelDirectoryPath,
  readReelDraft,
  sanitizeReelId,
} from "@/lib/reels";
import type { Character } from "@/lib/types/character";
import type { GenerationStatus } from "@/lib/types/generation";
import type {
  ReelScene,
  ReelScenesDocument,
  SceneAudioOutput,
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

  const document: ReelScenesDocument = {
    sourceText: sourceText.trim(),
    scenes: parseManualScenes(sourceText, characters, referenceAssets),
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

  return scenesDocument.scenes
    .map((scene): SceneWarning => {
      const knownCharacterNames = new Set(
        characters.map((character) => normalizeMention(character.name)),
      );
      const knownReferenceNames = new Set(
        referenceAssets.map((referenceAsset) =>
          normalizeMention(referenceAsset.name),
        ),
      );

      return {
        sceneId: scene.id,
        sceneOrder: scene.order,
        unknownCharacterNames: scene.characterNames.filter(
          (name) => !knownCharacterNames.has(normalizeMention(name)),
        ),
        unknownReferenceNames: scene.referenceNames.filter(
          (name) => !knownReferenceNames.has(normalizeMention(name)),
        ),
      };
    })
    .filter(
      (warning) =>
        warning.unknownCharacterNames.length > 0 ||
        warning.unknownReferenceNames.length > 0,
    );
}

export async function updateReelSceneStatus(
  reelId: string,
  sceneId: string,
  status: GenerationStatus,
  outputPath?: string,
) {
  const scenesDocument = await readReelScenes(reelId);

  if (!scenesDocument) {
    return null;
  }

  const scene = findReelScene(scenesDocument, sceneId);

  if (!scene) {
    return null;
  }

  const nextScene = {
    ...scene,
    status,
    outputPath: outputPath ?? scene.outputPath,
  };
  const nextDocument: ReelScenesDocument = {
    ...scenesDocument,
    scenes: scenesDocument.scenes.map((currentScene) =>
      currentScene.id === sceneId ? nextScene : currentScene,
    ),
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(getReelScenesFilePath(reelId), nextDocument);

  return nextScene;
}

export async function updateReelSceneAudio(
  reelId: string,
  sceneId: string,
  audioOutput: SceneAudioOutput,
) {
  const scenesDocument = await readReelScenes(reelId);

  if (!scenesDocument) {
    return null;
  }

  const scene = findReelScene(scenesDocument, sceneId);

  if (!scene) {
    return null;
  }

  const nextScene: ReelScene = {
    ...scene,
    audioOutput,
  };
  const nextDocument: ReelScenesDocument = {
    ...scenesDocument,
    scenes: scenesDocument.scenes.map((currentScene) =>
      currentScene.id === sceneId ? nextScene : currentScene,
    ),
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(getReelScenesFilePath(reelId), nextDocument);

  return nextScene;
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
  return splitSceneBlocks(sourceText).map((rawText, index): ReelScene => {
    const { audioText, videoText } = splitAudioSection(rawText);
    const durationSeconds = parseDurationSeconds(rawText);
    const characterNames = uniqueValues(extractCharacterMentions(rawText));
    const referenceNames = uniqueValues(extractReferenceMentions(rawText));

    return {
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      rawText,
      durationSeconds,
      videoPrompt: videoText,
      audioPlan: buildSceneAudioPlan({
        audioText,
        durationSeconds,
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
  });
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
  videoText,
}: {
  audioText: string;
  durationSeconds: number;
  videoText: string;
}): ReelScene["audioPlan"] {
  const trimmedAudioText = audioText.trim();

  if (!trimmedAudioText) {
    const speechPolicy = detectSpeechPolicy(videoText);

    return {
      source: "auto",
      prompt: buildAutomaticAudioPrompt(videoText, durationSeconds, speechPolicy),
      durationSeconds,
      speechPolicy,
      ambiencePrompt: "натуральна атмосфера сцени без різких шумів",
      musicPrompt: "легка фонова музика, що не перекриває дію",
      sfx: [],
    };
  }

  const cues = parseAudioCues(trimmedAudioText);
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

function isVoiceCue(description: string) {
  return /(voice|speech|dialogue|голос|мовлен|діалог|реплік|говорить|каже)/iu.test(
    description,
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
  const durationMatch = rawText.match(
    /(\d+(?:[.,]\d+)?)\s*(?:s|sec|secs|seconds?|сек|секунд[аи]?)/iu,
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

function normalizeMention(value: string) {
  return value.trim().toLowerCase();
}
