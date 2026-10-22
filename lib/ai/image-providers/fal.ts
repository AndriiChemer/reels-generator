import type {
  ImageGenerationInput,
  ImageGenerationResult,
  ImageProvider,
} from "@/lib/ai/image-providers/types";
import { readProjectImageAsDataUrl } from "@/lib/files/images";

/** Multi-reference image editing: keeps identity from several input images. */
const DEFAULT_FAL_IMAGE_MODEL = "fal-ai/nano-banana-pro/edit";
const DEFAULT_ESTIMATED_COST_USD = 0.15;
const FAL_SYNC_BASE_URL = "https://fal.run";
const FAL_IMAGE_TIMEOUT_MS = 180_000;

type FalImageResponse = {
  images?: Array<{ url?: string }>;
  detail?: string;
  message?: string;
};

export class FalImageProvider implements ImageProvider {
  readonly model: string;

  constructor(model = readFalImageModel()) {
    this.model = model;
  }

  async generateImage(
    input: ImageGenerationInput,
  ): Promise<ImageGenerationResult> {
    const imageUrls = await Promise.all(
      input.referenceImagePaths.map(readProjectImageAsDataUrl),
    );
    // Edit models need at least one input image. Without references we fall
    // back to the text-to-image version of the same model.
    const model = imageUrls.length > 0 ? this.model : toTextToImageModel(this.model);
    const payload = await falRun(model, {
      prompt: input.prompt,
      image_urls: imageUrls.length > 0 ? imageUrls : undefined,
      aspect_ratio: input.aspectRatio,
      resolution: "2K",
      output_format: "jpeg",
      num_images: 1,
      seed: input.seed,
    });
    const imageUrl = payload.images?.find((image) => image.url)?.url;

    if (!imageUrl) {
      throw new Error("fal.ai не повернув зображення кадру.");
    }

    return {
      provider: "fal",
      model,
      imageUrl,
      estimatedCostUsd: readEstimatedCostUsd(),
    };
  }
}

export function createFalImageProvider(model?: string) {
  return new FalImageProvider(model);
}

async function falRun(model: string, body: Record<string, unknown>) {
  let response: Response;

  try {
    response = await fetch(`${FAL_SYNC_BASE_URL}/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${readFalKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FAL_IMAGE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("fal.ai не згенерував кадр за 3 хвилини. Спробуй ще раз.");
    }

    throw error;
  }

  const payload = (await response.json().catch(() => ({}))) as FalImageResponse;

  if (!response.ok) {
    throw new Error(
      payload.message ||
        (typeof payload.detail === "string" ? payload.detail : undefined) ||
        `fal.ai image request failed with ${response.status}.`,
    );
  }

  return payload;
}

function toTextToImageModel(model: string) {
  return model.replace(/\/edit$/, "");
}

function readFalImageModel() {
  return process.env.FAL_IMAGE_MODEL?.trim() || DEFAULT_FAL_IMAGE_MODEL;
}

function readEstimatedCostUsd() {
  const value = Number.parseFloat(
    process.env.FAL_IMAGE_ESTIMATED_COST_USD?.trim() || "",
  );

  return Number.isFinite(value) && value >= 0 ? value : DEFAULT_ESTIMATED_COST_USD;
}

function readFalKey() {
  const key = process.env.FAL_KEY?.trim();

  if (!key) {
    throw new Error("FAL_KEY is missing. Add it to .env.local.");
  }

  return key;
}
