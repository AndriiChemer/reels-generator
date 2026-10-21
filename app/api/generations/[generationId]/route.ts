import { getVideoProvider } from "@/lib/ai/video-providers";
import {
  findGeneration,
  updateGenerationFromResult,
  upsertGeneration,
  withGenerationLog,
} from "@/lib/generations";
import { downloadSceneVideo } from "@/lib/files/media";
import { updateReelSceneStatus } from "@/lib/scenes";
import type { GenerationMetadata } from "@/lib/types/generation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ generationId: string }>;
  },
) {
  const { generationId } = await params;
  const generation = await findGeneration(generationId);

  if (!generation) {
    return jsonError("Generation не знайдено.", 404);
  }

  if (generation.status === "failed" && !isRecoverableStatusFailure(generation)) {
    return Response.json({ generation });
  }

  if (generation.status === "completed") {
    const completedGeneration = await ensureLocalOutput(generation);

    await updateReelSceneStatus(
      completedGeneration.reelId,
      completedGeneration.sceneId,
      completedGeneration.status,
      completedGeneration.outputPath,
    );

    return Response.json({ generation: completedGeneration });
  }

  try {
    const provider = getVideoProvider(generation.provider, generation.model);
    const result = await provider.getGenerationStatus(generation.id, {
      responseUrl: generation.providerResponseUrl,
      statusUrl: generation.providerStatusUrl,
    });
    const updatedGeneration = await updateGenerationFromResult(generation, result);
    const completedGeneration =
      updatedGeneration.status === "completed"
        ? await ensureLocalOutput(updatedGeneration)
        : updatedGeneration;

    await updateReelSceneStatus(
      completedGeneration.reelId,
      completedGeneration.sceneId,
      completedGeneration.status,
      completedGeneration.outputPath,
    );

    return Response.json({ generation: completedGeneration });
  } catch (error) {
    const errorMessage = readErrorMessage(error);
    const failedGeneration = await upsertGeneration(
      withGenerationLog(
        {
          ...generation,
          status: "failed",
          errorMessage,
          updatedAt: new Date().toISOString(),
        },
        `Помилка перевірки статусу: ${errorMessage}`,
      ),
    );

    await updateReelSceneStatus(
      failedGeneration.reelId,
      failedGeneration.sceneId,
      "failed",
    );

    return Response.json(
      { generation: failedGeneration, error: failedGeneration.errorMessage },
      { status: 502 },
    );
  }
}

async function ensureLocalOutput(generation: GenerationMetadata) {
  if (generation.outputPath) {
    return generation;
  }

  if (!generation.temporaryVideoUrl) {
    return upsertGeneration(
      withGenerationLog(
        {
          ...generation,
          status: "failed",
          errorMessage: "Provider завершив generation, але не повернув video URL.",
          updatedAt: new Date().toISOString(),
        },
        "Помилка: провайдер не повернув посилання на MP4.",
      ),
    );
  }

  const downloadingGeneration = await upsertGeneration(
    withGenerationLog(
      { ...generation, status: "processing" },
      "Завантажуємо готовий MP4 на локальний диск.",
    ),
  );

  try {
    const outputPath = await downloadSceneVideo({
      reelId: generation.reelId,
      sceneId: generation.sceneId,
      temporaryVideoUrl: generation.temporaryVideoUrl,
    });
    const completedGeneration = await upsertGeneration(
      withGenerationLog(
        {
          ...downloadingGeneration,
          outputPath,
          status: "completed",
          updatedAt: new Date().toISOString(),
        },
        "MP4 збережено локально. Сцена готова.",
      ),
    );

    await updateReelSceneStatus(
      completedGeneration.reelId,
      completedGeneration.sceneId,
      "completed",
      completedGeneration.outputPath,
    );

    return completedGeneration;
  } catch (error) {
    return upsertGeneration(
      withGenerationLog(
        {
          ...downloadingGeneration,
          status: "failed",
          errorMessage: readErrorMessage(error),
          updatedAt: new Date().toISOString(),
        },
        `Помилка завантаження MP4: ${readErrorMessage(error)}`,
      ),
    );
  }
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Provider status error.";
}

function isRecoverableStatusFailure(generation: GenerationMetadata) {
  return generation.errorMessage === "fal.ai request failed with 405.";
}
