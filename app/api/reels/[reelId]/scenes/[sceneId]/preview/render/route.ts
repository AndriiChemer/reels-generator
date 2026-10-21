import { assertFfmpegAvailable } from "@/lib/ffmpeg/assertFfmpegAvailable";
import { renderScenePreview } from "@/lib/ffmpeg/renderReel";
import {
  findReelScene,
  readReelScenes,
  updateReelScenePreview,
} from "@/lib/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const scenesDocument = await readReelScenes(reelId);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!scene) {
    return jsonError("Сцену не знайдено.", 404);
  }

  try {
    await assertFfmpegAvailable();
    const previewOutputPath = await renderScenePreview({ reelId, scene });
    const updatedScene = await updateReelScenePreview(reelId, sceneId, {
      outputPath: previewOutputPath,
    });

    return Response.json({ previewOutputPath, scene: updatedScene });
  } catch (error) {
    const errorMessage = readErrorMessage(error);
    await updateReelScenePreview(reelId, sceneId, { error: errorMessage });

    return Response.json({ error: errorMessage }, { status: 500 });
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Не вдалося зібрати preview сцени.";
}
