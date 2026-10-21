import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  DEFAULT_PROJECT_REELS_DIR,
  assertInsideRoot,
} from "@/lib/files/paths";
import { roundUsd } from "@/lib/costs";
import { readJsonFile, writeJsonFile } from "@/lib/files/json";
import { getReelDirectoryPath, sanitizeReelId } from "@/lib/reels";
import type { VideoGenerationResult } from "@/lib/ai/video-providers/types";
import type { GenerationMetadata } from "@/lib/types/generation";
import type { ReelScene } from "@/lib/types/reel";

const GENERATIONS_FILE_NAME = "generations.json";

export async function listGenerations(reelId: string) {
  const generations =
    await readJsonFile<GenerationMetadata[]>(getGenerationsFilePath(reelId));

  return (generations ?? []).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function findGeneration(generationId: string) {
  assertInsideRoot(DEFAULT_PROJECT_REELS_DIR, DEFAULT_PROJECT_REELS_DIR);

  try {
    const entries = await readdir(DEFAULT_PROJECT_REELS_DIR, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const generations = await listGenerations(entry.name);
      const generation = generations.find((item) => item.id === generationId);

      if (generation) {
        return generation;
      }
    }

    return null;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function upsertGeneration(generation: GenerationMetadata) {
  const generations = await listGenerations(generation.reelId);
  const generationIndex = generations.findIndex(
    (item) => item.id === generation.id,
  );
  const nextGenerations =
    generationIndex >= 0
      ? generations.map((item) =>
          item.id === generation.id ? generation : item,
        )
      : [generation, ...generations];

  await writeJsonFile(getGenerationsFilePath(generation.reelId), nextGenerations);

  return generation;
}

export async function updateGenerationFromResult(
  currentGeneration: GenerationMetadata,
  result: VideoGenerationResult,
  outputPath?: string,
) {
  const nextGeneration = withGenerationLog(
    {
      ...currentGeneration,
      status: result.status,
      estimatedCostUsd: resolveEstimatedCostUsd(
        currentGeneration.durationSeconds,
        result.estimatedCostUsd,
        currentGeneration.estimatedCostUsd,
      ),
    temporaryVideoUrl:
      result.temporaryVideoUrl ?? currentGeneration.temporaryVideoUrl,
      providerStatusUrl:
        result.providerStatusUrl ?? currentGeneration.providerStatusUrl,
      providerResponseUrl:
        result.providerResponseUrl ?? currentGeneration.providerResponseUrl,
      outputPath: outputPath ?? currentGeneration.outputPath,
      errorMessage: result.errorMessage,
      updatedAt: new Date().toISOString(),
    },
    getProviderProgressMessage(result.status, result.errorMessage),
  );

  return upsertGeneration(nextGeneration);
}

export function createGenerationFromResult({
  reelId,
  result,
  scene,
}: {
  reelId: string;
  result: VideoGenerationResult;
  scene: ReelScene;
}) {
  const now = new Date().toISOString();

  const generation = {
    id: result.generationId || createLocalGenerationId(now, scene.id),
    reelId,
    sceneId: scene.id,
    provider: result.provider,
    model: result.model,
    status: result.status,
    durationSeconds: scene.durationSeconds,
    estimatedCostUsd: resolveEstimatedCostUsd(
      scene.durationSeconds,
      result.estimatedCostUsd,
    ),
    temporaryVideoUrl: result.temporaryVideoUrl,
    providerStatusUrl: result.providerStatusUrl,
    providerResponseUrl: result.providerResponseUrl,
    errorMessage: result.errorMessage,
    createdAt: now,
    updatedAt: now,
  } satisfies GenerationMetadata;

  return withGenerationLog(
    generation,
    getProviderProgressMessage(result.status, result.errorMessage),
  );
}

export function createFailedGeneration({
  errorMessage,
  reelId,
  scene,
}: {
  errorMessage: string;
  reelId: string;
  scene: ReelScene;
}) {
  const now = new Date().toISOString();

  const generation = {
    id: createLocalGenerationId(now, scene.id),
    reelId,
    sceneId: scene.id,
    provider: "fal",
    model: process.env.FAL_VIDEO_MODEL?.trim() || "fal-ai/fast-svd/text-to-video",
    status: "failed",
    durationSeconds: scene.durationSeconds,
    errorMessage,
    createdAt: now,
    updatedAt: now,
  } satisfies GenerationMetadata;

  return withGenerationLog(generation, `Помилка запуску: ${errorMessage}`);
}

export function withGenerationLog(
  generation: GenerationMetadata,
  message: string,
) {
  const latestEntry = generation.activityLog?.at(-1);

  if (
    latestEntry?.message === message &&
    generation.progressMessage === message
  ) {
    return generation;
  }

  const now = new Date().toISOString();
  const activityLog = [
    ...(generation.activityLog ?? []),
    { createdAt: now, message },
  ].slice(-20);

  return {
    ...generation,
    activityLog,
    progressMessage: message,
    updatedAt: now,
  };
}

export function getGenerationsFilePath(reelId: string) {
  const safeReelId = sanitizeReelId(reelId);
  const filePath = path.join(
    getReelDirectoryPath(safeReelId),
    GENERATIONS_FILE_NAME,
  );

  assertInsideRoot(DEFAULT_PROJECT_REELS_DIR, filePath);

  return filePath;
}

function createLocalGenerationId(timestamp: string, sceneId: string) {
  const timestampPart = timestamp.replace(/\D/g, "").slice(0, 17);

  return `generation-${sceneId}-${timestampPart}`;
}

function getProviderProgressMessage(
  status: GenerationMetadata["status"],
  errorMessage?: string,
): string {
  switch (status) {
    case "queued":
      return "Запит прийнято. Очікуємо місце в черзі провайдера.";
    case "processing":
      return "Провайдер генерує відео.";
    case "completed":
      return "Провайдер завершив генерацію. Готуємо локальний MP4.";
    case "failed":
      return errorMessage
        ? `Помилка провайдера: ${errorMessage}`
        : "Генерація не вдалася.";
  }
}

function resolveEstimatedCostUsd(
  durationSeconds: number,
  providerEstimatedCostUsd?: number,
  currentEstimatedCostUsd?: number,
) {
  if (isValidCost(providerEstimatedCostUsd)) {
    return providerEstimatedCostUsd;
  }

  if (isValidCost(currentEstimatedCostUsd)) {
    return currentEstimatedCostUsd;
  }

  const costPerSecond = readEstimatedCostPerSecondUsd();

  if (!isValidCost(costPerSecond)) {
    return undefined;
  }

  return roundUsd(durationSeconds * costPerSecond);
}

function readEstimatedCostPerSecondUsd() {
  const rawCost = process.env.FAL_ESTIMATED_COST_PER_SECOND_USD?.trim();

  if (!rawCost) {
    return undefined;
  }

  const cost = Number.parseFloat(rawCost);

  return Number.isFinite(cost) && cost >= 0 ? cost : undefined;
}

function isValidCost(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
