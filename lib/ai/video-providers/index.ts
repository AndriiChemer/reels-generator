import { createFalVideoProvider } from "@/lib/ai/video-providers/fal";
import type { VideoProvider } from "@/lib/ai/video-providers/types";
import type { VideoProviderName } from "@/lib/types/generation";

export function getVideoProvider(
  providerName: VideoProviderName = readVideoProviderName(),
  model?: string,
): VideoProvider {
  if (providerName === "fal") {
    return createFalVideoProvider(model);
  }

  throw new Error(`Unsupported video provider: ${providerName}`);
}

function readVideoProviderName(): VideoProviderName {
  const providerName = process.env.VIDEO_PROVIDER?.trim() || "fal";

  if (providerName !== "fal") {
    throw new Error(`Unsupported VIDEO_PROVIDER: ${providerName}`);
  }

  return providerName;
}

export type {
  VideoGenerationInput,
  VideoGenerationResult,
  VideoProvider,
} from "@/lib/ai/video-providers/types";
