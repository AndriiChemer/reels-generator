import { listCharacters } from "@/lib/characters";
import { findClip, listClipAssets, normalizeClipName, saveClip } from "@/lib/clips";
import { listReferenceAssets } from "@/lib/references";
import {
  findReelScene,
  readReelScenes,
  saveReelScenes,
  setSceneClipInScript,
} from "@/lib/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Uses a ready-made video for a scene instead of generating one.
 *
 * Form fields:
 * - name: clip name in the library (references/clips), e.g. "endcard"
 * - file: optional upload; without it an existing library clip is used
 *
 * The scene script gets the line "Відео: #name", so the choice survives
 * script edits and the same clip can be reused in any reel.
 */
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const scenesDocument = await readReelScenes(reelId);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!scenesDocument || !scene) {
    return jsonError("Сцену не знайдено.", 404);
  }

  try {
    const formData = await request.formData();
    const clipName = normalizeClipName(String(formData.get("name") ?? ""));
    const file = formData.get("file");

    if (file instanceof File && file.size > 0) {
      await saveClip(clipName, file);
    }

    if (!findClip(clipName, await listClipAssets())) {
      return jsonError(`Кліпу #${clipName} немає в references/clips — завантаж файл.`, 422);
    }

    const [characters, referenceAssets] = await Promise.all([
      listCharacters(),
      listReferenceAssets(),
    ]);
    const nextSourceText = setSceneClipInScript(scenesDocument.sourceText, scene, clipName);

    await saveReelScenes(reelId, nextSourceText, characters, referenceAssets);

    return Response.json({ clipName }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Не вдалося додати кліп.", 400);
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
