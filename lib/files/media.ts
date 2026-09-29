import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  OUTPUTS_DIR,
  OUTPUT_AUDIO_REELS_DIR,
  OUTPUT_AUDIO_SCENES_DIR,
  OUTPUT_REELS_DIR,
  OUTPUT_SCENES_DIR,
  assertInsideRoot,
} from "@/lib/files/paths";
import { sanitizeReelId } from "@/lib/reels";
import type { AudioGenerationResult } from "@/lib/types/audio-generation";

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  ".mp3",
  ".mp4",
  ".ogg",
  ".wav",
]);
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;
const MAX_AUDIO_BYTES = 32 * 1024 * 1024;

export function getSceneOutputPath(reelId: string, sceneId: string) {
  const safeReelId = sanitizeReelId(reelId);
  const safeSceneId = sanitizeMediaSegment(sceneId);
  const filePath = path.join(OUTPUT_SCENES_DIR, safeReelId, `${safeSceneId}.mp4`);

  assertInsideRoot(OUTPUT_SCENES_DIR, filePath);

  return filePath;
}

export function getFinalReelOutputPath(reelId: string) {
  const safeReelId = sanitizeReelId(reelId);
  const filePath = path.join(OUTPUT_REELS_DIR, safeReelId, "final.mp4");

  assertInsideRoot(OUTPUT_REELS_DIR, filePath);

  return filePath;
}

export function getSceneAudioOutputPath(
  reelId: string,
  sceneId: string,
  extension: AudioGenerationResult["extension"],
) {
  const safeReelId = sanitizeReelId(reelId);
  const safeSceneId = sanitizeMediaSegment(sceneId);
  const safeExtension = normalizeAudioExtension(extension);
  const filePath = path.join(
    OUTPUT_AUDIO_SCENES_DIR,
    safeReelId,
    `${safeSceneId}.${safeExtension}`,
  );

  assertInsideRoot(OUTPUT_AUDIO_SCENES_DIR, filePath);

  return filePath;
}

export function getReelBackgroundAudioOutputPath(
  reelId: string,
  extension: AudioGenerationResult["extension"],
) {
  const safeReelId = sanitizeReelId(reelId);
  const safeExtension = normalizeAudioExtension(extension);
  const filePath = path.join(
    OUTPUT_AUDIO_REELS_DIR,
    safeReelId,
    `background.${safeExtension}`,
  );

  assertInsideRoot(OUTPUT_AUDIO_REELS_DIR, filePath);

  return filePath;
}

export function toOutputRelativePath(filePath: string) {
  assertInsideRoot(OUTPUTS_DIR, filePath);

  return path.relative(OUTPUTS_DIR, filePath).split(path.sep).join("/");
}

export function toMediaUrl(outputPath: string) {
  const normalizedPath = normalizeMediaPath(outputPath);

  return `/api/media/${normalizedPath}`;
}

export function resolveOutputMediaPath(mediaPath: string | string[]) {
  const normalizedPath = normalizeMediaPath(mediaPath);
  const filePath = path.join(OUTPUTS_DIR, normalizedPath);

  assertInsideRoot(OUTPUTS_DIR, filePath);
  assertAllowedMediaExtension(filePath);

  return filePath;
}

export async function readOutputMediaFile(mediaPath: string | string[]) {
  return readFile(resolveOutputMediaPath(mediaPath));
}

export async function downloadSceneVideo({
  reelId,
  sceneId,
  temporaryVideoUrl,
}: {
  reelId: string;
  sceneId: string;
  temporaryVideoUrl: string;
}) {
  assertHttpUrl(temporaryVideoUrl);

  const outputPath = getSceneOutputPath(reelId, sceneId);
  const response = await fetch(temporaryVideoUrl);

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити MP4: ${response.status}.`);
  }

  const contentLength = Number(response.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
    throw new Error("MP4 завеликий для локального MVP.");
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer());

  if (videoBuffer.byteLength === 0) {
    throw new Error("Provider повернув порожній MP4.");
  }

  if (videoBuffer.byteLength > MAX_VIDEO_BYTES) {
    throw new Error("MP4 завеликий для локального MVP.");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });

  const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;

  await writeFile(temporaryPath, videoBuffer);
  await rename(temporaryPath, outputPath);

  return toOutputRelativePath(outputPath);
}

export async function saveSceneAudio({
  reelId,
  sceneId,
  result,
}: {
  reelId: string;
  sceneId: string;
  result: AudioGenerationResult;
}) {
  const outputPath = getSceneAudioOutputPath(reelId, sceneId, result.extension);

  await saveAudioBuffer(outputPath, result.audioBytes);

  return toOutputRelativePath(outputPath);
}

export async function saveReelBackgroundAudio({
  reelId,
  result,
}: {
  reelId: string;
  result: AudioGenerationResult;
}) {
  const outputPath = getReelBackgroundAudioOutputPath(reelId, result.extension);

  await saveAudioBuffer(outputPath, result.audioBytes);

  return toOutputRelativePath(outputPath);
}

async function saveAudioBuffer(outputPath: string, audioBytes: ArrayBuffer) {
  const audioBuffer = Buffer.from(audioBytes);

  if (audioBuffer.byteLength === 0) {
    throw new Error("Audio provider повернув порожній файл.");
  }

  if (audioBuffer.byteLength > MAX_AUDIO_BYTES) {
    throw new Error("Аудіофайл завеликий для локального MVP.");
  }

  await mkdir(path.dirname(outputPath), { recursive: true });

  const temporaryPath = `${outputPath}.${randomUUID()}.tmp`;

  await writeFile(temporaryPath, audioBuffer);
  await rename(temporaryPath, outputPath);
}

function normalizeMediaPath(mediaPath: string | string[]) {
  const joinedPath = Array.isArray(mediaPath) ? mediaPath.join("/") : mediaPath;
  const normalizedPath = path.posix.normalize(joinedPath.trim());

  if (
    !normalizedPath ||
    normalizedPath === "." ||
    normalizedPath.startsWith("../") ||
    normalizedPath.includes("/../") ||
    path.isAbsolute(normalizedPath)
  ) {
    throw new Error("Invalid media path.");
  }

  assertAllowedMediaExtension(normalizedPath);

  return normalizedPath;
}

function assertAllowedMediaExtension(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (!ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
    throw new Error("Unsupported media extension.");
  }
}

function normalizeAudioExtension(extension: AudioGenerationResult["extension"]) {
  switch (extension) {
    case "mp3":
    case "wav":
      return extension;
    case "opus":
      return "ogg";
    default:
      throw new Error(
        "Цей формат аудіо не підтримується для локального preview. Обери mp3 або wav.",
      );
  }
}

function assertHttpUrl(value: string) {
  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Invalid protocol.");
    }
  } catch {
    throw new Error("Provider video URL is invalid.");
  }
}

function sanitizeMediaSegment(value: string) {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!sanitized) {
    throw new Error("Invalid media path segment.");
  }

  return sanitized;
}
