import type {
  VideoGenerationInput,
  VideoGenerationResult,
  VideoProvider,
} from "@/lib/ai/video-providers/types";
import type { GenerationStatus } from "@/lib/types/generation";

const FAL_QUEUE_BASE_URL = "https://queue.fal.run";
const DEFAULT_FAL_VIDEO_MODEL = "fal-ai/fast-svd/text-to-video";

type FalQueueSubmitResponse = {
  request_id?: string;
  requestId?: string;
};

type FalQueueStatusResponse = {
  status?: string;
  error?: string | { message?: string };
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
      body: JSON.stringify(buildFalInput(input)),
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
      rawResponse: payload,
    };
  }

  async getGenerationStatus(
    generationId: string,
  ): Promise<VideoGenerationResult> {
    const statusResponse = await falFetch(
      `${this.model}/requests/${encodeURIComponent(generationId)}/status`,
      {
        method: "GET",
      },
    );
    const statusPayload = (await statusResponse.json()) as FalQueueStatusResponse;
    const status = mapFalStatus(statusPayload.status);

    if (status === "completed") {
      return this.getCompletedResult(generationId, statusPayload);
    }

    return {
      provider: "fal",
      model: this.model,
      generationId,
      status,
      errorMessage: status === "failed" ? readFalError(statusPayload.error) : undefined,
      rawResponse: statusPayload,
    };
  }

  private async getCompletedResult(
    generationId: string,
    statusPayload: FalQueueStatusResponse,
  ): Promise<VideoGenerationResult> {
    const resultResponse = await falFetch(
      `${this.model}/requests/${encodeURIComponent(generationId)}/response`,
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
      temporaryVideoUrl: extractVideoUrl(resultPayload.data),
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

function buildFalInput(input: VideoGenerationInput) {
  return {
    ...input.extraInput,
    prompt: input.prompt,
    video_size: mapAspectRatio(input.aspectRatio),
    negative_prompt: input.negativePrompt,
    seed: input.seed,
  };
}

function mapAspectRatio(aspectRatio: VideoGenerationInput["aspectRatio"]) {
  if (aspectRatio === "9:16") {
    return "portrait_16_9";
  }

  return "portrait_16_9";
}

async function falFetch(path: string, init: RequestInit) {
  const response = await fetch(`${FAL_QUEUE_BASE_URL}/${path}`, {
    ...init,
    headers: {
      Authorization: `Key ${readFalKey()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await readFalHttpError(response));
  }

  return response;
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
