import { assertFfmpegAvailable } from "@/lib/ffmpeg/assertFfmpegAvailable";
import { renderReel } from "@/lib/ffmpeg/renderReel";
import { updateReelFinalRender } from "@/lib/reels";
import { readReelScenes } from "@/lib/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string }>;
  },
) {
  const { reelId } = await params;
  const scenesDocument = await readReelScenes(reelId);

  if (!scenesDocument || scenesDocument.scenes.length === 0) {
    return jsonError("Спершу збережи сцени для цього Reel.", 400);
  }

  try {
    await assertFfmpegAvailable();

    const finalOutputPath = await renderReel({
      reelId,
      scenes: scenesDocument.scenes,
    });
    const reel = await updateReelFinalRender(reelId, { finalOutputPath });

    return Response.json({ reel, finalOutputPath });
  } catch (error) {
    const errorMessage = readErrorMessage(error);
    const reel = await updateReelFinalRender(reelId, {
      finalRenderError: errorMessage,
    });

    return Response.json(
      { reel, error: errorMessage },
      {
        status: 500,
      },
    );
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "FFmpeg render failed.";
}
