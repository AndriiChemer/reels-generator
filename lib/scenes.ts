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
import type { ReelScene, ReelScenesDocument } from "@/lib/types/reel";

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
    const characterNames = uniqueValues(extractCharacterMentions(rawText));
    const referenceNames = uniqueValues(extractReferenceMentions(rawText));

    return {
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      order: index + 1,
      rawText,
      durationSeconds: parseDurationSeconds(rawText),
      videoPrompt: rawText,
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
