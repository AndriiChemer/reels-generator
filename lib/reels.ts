import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  DATA_DIR,
  DEFAULT_PROJECT_REELS_DIR,
  assertInsideRoot,
} from "@/lib/files/paths";
import { readJsonFile, writeJsonFile } from "@/lib/files/json";
import type {
  ReelBackgroundAudioOutput,
  ReelDraft,
  ReelDraftInput,
} from "@/lib/types/reel";

const REEL_FILE_NAME = "reel.json";

export async function createReelDraft(input: ReelDraftInput) {
  assertInsideRoot(DATA_DIR, DEFAULT_PROJECT_REELS_DIR);

  const now = new Date().toISOString();
  const id = await createUniqueReelId(now);
  const reel: ReelDraft = {
    id,
    ...normalizeReelInput(input),
    createdAt: now,
    updatedAt: now,
  };

  await writeJsonFile(getReelFilePath(id), reel);

  return reel;
}

/** Updates title, idea and the shared look of a reel. */
export async function updateReelDraft(reelId: string, input: ReelDraftInput) {
  const reel = await readReelDraft(reelId);

  if (!reel) {
    throw new Error("Reel draft does not exist.");
  }

  const nextReel: ReelDraft = {
    ...reel,
    ...normalizeReelInput(input),
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(getReelFilePath(reelId), nextReel);

  return nextReel;
}

export async function readReelDraft(reelId: string) {
  return readJsonFile<ReelDraft>(getReelFilePath(reelId));
}

export async function updateReelFinalRender(
  reelId: string,
  result:
    | {
        finalOutputPath: string;
        finalRenderError?: undefined;
      }
    | {
        finalOutputPath?: undefined;
        finalRenderError: string;
      },
) {
  const reel = await readReelDraft(reelId);

  if (!reel) {
    throw new Error("Reel draft does not exist.");
  }

  const now = new Date().toISOString();
  const nextReel: ReelDraft = {
    ...reel,
    finalOutputPath: result.finalOutputPath ?? reel.finalOutputPath,
    finalRenderedAt: result.finalOutputPath ? now : reel.finalRenderedAt,
    finalRenderError: result.finalRenderError,
    updatedAt: now,
  };

  await writeJsonFile(getReelFilePath(reelId), nextReel);

  return nextReel;
}

export async function updateReelBackgroundAudio(
  reelId: string,
  backgroundAudio: ReelBackgroundAudioOutput,
) {
  const reel = await readReelDraft(reelId);

  if (!reel) {
    throw new Error("Reel draft does not exist.");
  }

  const nextReel: ReelDraft = {
    ...reel,
    backgroundAudio,
    updatedAt: new Date().toISOString(),
  };

  await writeJsonFile(getReelFilePath(reelId), nextReel);

  return nextReel;
}

export async function listReelDrafts() {
  assertInsideRoot(DATA_DIR, DEFAULT_PROJECT_REELS_DIR);

  try {
    const entries = await readdir(DEFAULT_PROJECT_REELS_DIR, {
      withFileTypes: true,
    });
    const reels = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => readReelDraft(entry.name)),
    );

    return reels
      .filter((reel): reel is ReelDraft => Boolean(reel))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function getReelFilePath(reelId: string) {
  const safeReelId = sanitizeReelId(reelId);
  const filePath = path.join(getReelDirectoryPath(safeReelId), REEL_FILE_NAME);

  assertInsideRoot(DEFAULT_PROJECT_REELS_DIR, filePath);

  return filePath;
}

export function getReelDirectoryPath(reelId: string) {
  const safeReelId = sanitizeReelId(reelId);
  const directoryPath = path.join(DEFAULT_PROJECT_REELS_DIR, safeReelId);

  assertInsideRoot(DEFAULT_PROJECT_REELS_DIR, directoryPath);

  return directoryPath;
}

export function sanitizeReelId(reelId: string) {
  const sanitized = reelId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!sanitized) {
    throw new Error("Invalid reel id.");
  }

  return sanitized;
}

async function createUniqueReelId(timestamp: string) {
  const timestampPart = timestamp.replace(/\D/g, "").slice(0, 14);
  const baseId = `reel-${timestampPart}`;
  let id = baseId;
  let index = 2;

  while (await readReelDraft(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }

  return id;
}

function normalizeReelInput(input: ReelDraftInput) {
  return {
    title: input.title.trim(),
    story: input.story.trim(),
    artStyle: input.artStyle ?? "reference",
    style: optionalText(input.style),
    setting: optionalText(input.setting),
    wardrobe: optionalText(input.wardrobe),
    narratorCharacterId: optionalText(input.narratorCharacterId),
    voiceMood: input.voiceMood,
    voiceSpeed: input.voiceSpeed,
  };
}

function optionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
