import type {
  VideoGenerationInput,
  VideoGenerationResult,
  VideoProvider,
  VideoReferenceSet,
} from "@/lib/ai/video-providers/types";
import { readProjectImageAsDataUrl } from "@/lib/files/images";
import type { GenerationStatus } from "@/lib/types/generation";

const FAL_QUEUE_BASE_URL = "https://queue.fal.run";
const DEFAULT_FAL_VIDEO_MODEL = "fal-ai/kling-video/v3/pro/image-to-video";
const KLING_REFERENCE_MODEL = "fal-ai/kling-video/v3/pro/image-to-video";
const FAL_REQUEST_TIMEOUT_MS = 60_000;
const QUEUE_MODEL_ALIASES: Record<string, string> = {
  "fal-ai/fast-svd/text-to-video": "fal-ai/fast-svd",
};

type FalQueueSubmitResponse = {
  request_id?: string;
  requestId?: string;
  response_url?: string;
  responseUrl?: string;
  status_url?: string;
  statusUrl?: string;
};

type FalQueueStatusResponse = {
  status?: string;
  error?: string | { message?: string };
  response_url?: string;
  responseUrl?: string;
  status_url?: string;
  statusUrl?: string;
};

type FalQueueResultResponse = {
  data?: unknown;
  requestId?: string;
  request_id?: string;
};

export class FalVideoProvider implements VideoProvider {
  readonly model: string;

  constructor(model = readFalModel()) {
    this.model = model;
  }

  async generateVideo(
    input: VideoGenerationInput,
  ): Promise<VideoGenerationResult> {
    const response = await falFetch(this.model, {
      body: JSON.stringify(await buildFalInput(this.model, input)),
      method: "POST",
    });
    const payload = (await response.json()) as FalQueueSubmitResponse;
    const generationId = payload.request_id || payload.requestId;

    if (!generationId) {
      return {
        provider: "fal",
        model: this.model,
        generationId: "",
        status: "failed",
        errorMessage: "fal.ai не повернув request id.",
        rawResponse: payload,
      };
    }

    return {
      provider: "fal",
      model: this.model,
      generationId,
      status: "queued",
      providerResponseUrl: readResponseUrl(payload),
      providerStatusUrl: readStatusUrl(payload),
      rawResponse: payload,
    };
  }

  async getGenerationStatus(
    generationId: string,
    urls?: { responseUrl?: string; statusUrl?: string },
  ): Promise<VideoGenerationResult> {
    const statusResponse = await falFetch(
      urls?.statusUrl || getStatusPath(this.model, generationId),
      {
        method: "GET",
      },
    );
    const statusPayload = (await statusResponse.json()) as FalQueueStatusResponse;
    const status = mapFalStatus(statusPayload.status);
    const statusUrl = readStatusUrl(statusPayload) ?? urls?.statusUrl;
    const responseUrl = readResponseUrl(statusPayload) ?? urls?.responseUrl;

    if (status === "completed") {
      return this.getCompletedResult(generationId, statusPayload, responseUrl, statusUrl);
    }

    return {
      provider: "fal",
      model: this.model,
      generationId,
      status,
      providerResponseUrl: responseUrl,
      providerStatusUrl: statusUrl,
      errorMessage: status === "failed" ? readFalError(statusPayload.error) : undefined,
      rawResponse: statusPayload,
    };
  }

  private async getCompletedResult(
    generationId: string,
    statusPayload: FalQueueStatusResponse,
    responseUrl?: string,
    statusUrl?: string,
  ): Promise<VideoGenerationResult> {
    const resultResponse = await falFetch(
      responseUrl || getResponsePath(this.model, generationId),
      {
        method: "GET",
      },
    );
    const resultPayload = (await resultResponse.json()) as FalQueueResultResponse;

    return {
      provider: "fal",
      model: this.model,
      generationId,
      status: "completed",
      providerResponseUrl: responseUrl,
      providerStatusUrl: statusUrl,
      temporaryVideoUrl: extractVideoUrl(resultPayload.data ?? resultPayload),
      rawResponse: {
        status: statusPayload,
        result: resultPayload,
      },
    };
  }
}

export function createFalVideoProvider(model?: string) {
  return new FalVideoProvider(model);
}

async function buildFalInput(model: string, input: VideoGenerationInput) {
  if (model !== KLING_REFERENCE_MODEL) {
    throw new Error(
      "Для генерації з реальними референсами встанови FAL_VIDEO_MODEL=fal-ai/kling-video/v3/pro/image-to-video.",
    );
  }

  if (!input.startImagePath) {
    throw new Error("Спершу згенеруй кадр сцени — він стане першим кадром відео.");
  }

  const startImageUrl = await readProjectImageAsDataUrl(input.startImagePath);
  const endImageUrl = input.endImagePath
    ? await readProjectImageAsDataUrl(input.endImagePath)
    : undefined;
  const referenceSets = deduplicateReferenceSets(input.referenceSets || []);
  const elements = await Promise.all(
    referenceSets.map(async (referenceSet) => {
      const imageUrls = await readReferenceSet(referenceSet);
      const frontalImageUrl = imageUrls[0];

      return {
        frontal_image_url: frontalImageUrl,
        // Kling requires at least one image in this field. Duplicating a single
        // portrait is intentional and improves identity preservation.
        reference_image_urls:
          imageUrls.slice(1, 4).length > 0
            ? imageUrls.slice(1, 4)
            : [frontalImageUrl],
      };
    }),
  );

  return {
    ...input.extraInput,
    prompt: buildReferencePrompt(input.prompt, referenceSets),
    start_image_url: startImageUrl,
    end_image_url: endImageUrl,
    duration: String(clampDuration(input.durationSeconds)),
    aspect_ratio: input.aspectRatio,
    generate_audio: false,
    elements: elements.length > 0 ? elements : undefined,
    shot_type: "customize",
    negative_prompt: input.negativePrompt,
    cfg_scale: 0.8,
    seed: input.seed,
  };
}

async function readReferenceSet(referenceSet: VideoReferenceSet) {
  const imagePaths = [...new Set(referenceSet.imagePaths)].slice(0, 4);

  if (imagePaths.length === 0) {
    throw new Error(`Референс «${referenceSet.label}» не містить картинки.`);
  }

  return Promise.all(imagePaths.map(readProjectImageAsDataUrl));
}

function deduplicateReferenceSets(referenceSets: VideoReferenceSet[]) {
  const seen = new Set<string>();

  return referenceSets.filter((referenceSet) => {
    const key = referenceSet.imagePaths.join("|");

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildReferencePrompt(prompt: string, referenceSets: VideoReferenceSet[]) {
  if (referenceSets.length === 0) {
    return prompt;
  }

  const bindings = referenceSets
    .map(
      (referenceSet, index) =>
        `@Element${index + 1} is ${referenceSet.label}. Preserve the exact identity, colors, proportions and recognizable details.`,
    )
    .join("\n");

  return `${prompt}\n\nReferences:\n${bindings}`;
}

function clampDuration(durationSeconds: number) {
  return Math.min(Math.max(Math.round(durationSeconds), 3), 15);
}

async function falFetch(path: string, init: RequestInit) {
  let response: Response;

  try {
    response = await fetch(resolveFalQueueUrl(path), {
      ...init,
      headers: {
        Authorization: `Key ${readFalKey()}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
      signal: init.signal ?? AbortSignal.timeout(FAL_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("fal.ai не відповів протягом 60 секунд. Спробуй ще раз.");
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(await readFalHttpError(response));
  }

  return response;
}

function getStatusPath(model: string, generationId: string) {
  return `${getQueueModel(model)}/requests/${encodeURIComponent(generationId)}/status`;
}

function getResponsePath(model: string, generationId: string) {
  return `${getQueueModel(model)}/requests/${encodeURIComponent(generationId)}`;
}

function getQueueModel(model: string) {
  return QUEUE_MODEL_ALIASES[model] || model;
}

function resolveFalQueueUrl(path: string) {
  if (!path.startsWith("http://") && !path.startsWith("https://")) {
    return `${FAL_QUEUE_BASE_URL}/${path}`;
  }

  const url = new URL(path);

  if (url.protocol !== "https:" || url.hostname !== "queue.fal.run") {
    throw new Error("fal.ai повернув непідтримуваний URL статусу.");
  }

  return url.toString();
}

function readFalKey() {
  const key = process.env.FAL_KEY?.trim();

  if (!key) {
    throw new Error("FAL_KEY is missing. Add it to .env.local.");
  }

  return key;
}

function readFalModel() {
  return process.env.FAL_VIDEO_MODEL?.trim() || DEFAULT_FAL_VIDEO_MODEL;
}

function mapFalStatus(status: string | undefined): GenerationStatus {
  switch (status) {
    case "COMPLETED":
    case "OK":
      return "completed";
    case "IN_PROGRESS":
      return "processing";
    case "FAILED":
    case "ERROR":
      return "failed";
    case "IN_QUEUE":
    default:
      return "queued";
  }
}

function readStatusUrl(value: FalQueueSubmitResponse | FalQueueStatusResponse) {
  return value.status_url || value.statusUrl;
}

function readResponseUrl(value: FalQueueSubmitResponse | FalQueueStatusResponse) {
  return value.response_url || value.responseUrl;
}

function readFalError(error: FalQueueStatusResponse["error"]) {
  if (!error) {
    return "fal.ai generation failed.";
  }

  return typeof error === "string"
    ? error
    : error.message || "fal.ai generation failed.";
}

async function readFalHttpError(response: Response) {
  const fallbackMessage = `fal.ai request failed with ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      detail?: string;
      error?: string | { message?: string };
      message?: string;
    };

    if (payload.message) {
      return payload.message;
    }

    if (payload.detail) {
      return payload.detail;
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }

    if (payload.error?.message) {
      return payload.error.message;
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function extractVideoUrl(data: unknown): string | undefined {
  if (!isRecord(data)) {
    return undefined;
  }

  const video = data.video;

  if (isRecord(video) && typeof video.url === "string") {
    return video.url;
  }

  if (Array.isArray(data.videos)) {
    const firstVideo = data.videos.find(isRecord);

    if (firstVideo && typeof firstVideo.url === "string") {
      return firstVideo.url;
    }
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
