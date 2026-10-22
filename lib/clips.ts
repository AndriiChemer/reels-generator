import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CLIPS_DIR, assertInsideRoot } from "@/lib/files/paths";

/**
 * Library of reusable videos in references/clips/. A scene uses one with the
 * line "Відео: #name" — the clip is copied into the reel instead of paying
 * for a new generation.
 */

const CLIP_EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm"]);
const MAX_CLIP_BYTES = 200 * 1024 * 1024;
const CLIP_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]{0,40}$/;

export type ClipAsset = {
  name: string;
  /** Absolute path on disk. */
  filePath: string;
};

export async function listClipAssets(): Promise<ClipAsset[]> {
  try {
    const entries = await readdir(CLIPS_DIR, { withFileTypes: true });

    return entries
      .filter(
        (entry) =>
          entry.isFile() && CLIP_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
      )
      .map((entry) => ({
        name: path.basename(entry.name, path.extname(entry.name)).toLowerCase(),
        filePath: path.join(CLIPS_DIR, entry.name),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function findClip(name: string, clips: ClipAsset[]) {
  const normalizedName = name.trim().toLowerCase();

  return clips.find((clip) => clip.name === normalizedName) ?? null;
}

export function normalizeClipName(value: string) {
  const name = value.trim().toLowerCase().replace(/^#/, "");

  if (!CLIP_NAME_PATTERN.test(name)) {
    throw new Error("Назва кліпу: латинські літери, цифри, «-» або «_», наприклад endcard.");
  }

  return name;
}

/** Saves an uploaded video into the library, replacing a clip with the same name. */
export async function saveClip(name: string, file: File) {
  const extension = path.extname(file.name).toLowerCase();

  if (!CLIP_EXTENSIONS.has(extension)) {
    throw new Error("Підтримуються відео MP4, MOV, M4V або WebM.");
  }

  if (file.size === 0 || file.size > MAX_CLIP_BYTES) {
    throw new Error("Відео порожнє або більше за 200 МБ.");
  }

  const clipName = normalizeClipName(name);
  const filePath = path.join(CLIPS_DIR, `${clipName}${extension}`);
  const existing = findClip(clipName, await listClipAssets());

  assertInsideRoot(CLIPS_DIR, filePath);

  // One file per name, so "#endcard" always means exactly one video.
  if (existing && existing.filePath !== filePath) {
    throw new Error(
      `Кліп #${clipName} уже є з іншим розширенням. Обери іншу назву або заміни файл у references/clips.`,
    );
  }

  await mkdir(CLIPS_DIR, { recursive: true });
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  return filePath;
}
