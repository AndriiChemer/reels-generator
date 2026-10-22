import type {
  GenerationStatus,
  VideoProviderName,
} from "@/lib/types/generation";

export type VideoGenerationInput = {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16";
  /** First frame (scene keyframe). Project image path. */
  startImagePath?: string;
  /** Optional last frame, e.g. the next scene keyframe for a seamless transition. */
  endImagePath?: string;
  /** Character, product, UI, or logo reference image groups for the provider. */
  referenceSets?: VideoReferenceSet[];
  negativePrompt?: string;
  seed?: number;
  extraInput?: Record<string, unknown>;
};

export type VideoReferenceSet = {
  label: string;
  imagePaths: string[];
};

export type VideoGenerationResult = {
  provider: VideoProviderName;
  model: string;
  generationId: string;
  status: GenerationStatus;
  temporaryVideoUrl?: string;
  providerStatusUrl?: string;
  providerResponseUrl?: string;
  errorMessage?: string;
  estimatedCostUsd?: number;
  rawResponse?: unknown;
};

export interface VideoProvider {
  generateVideo(input: VideoGenerationInput): Promise<VideoGenerationResult>;
  getGenerationStatus(
    generationId: string,
    urls?: { responseUrl?: string; statusUrl?: string },
  ): Promise<VideoGenerationResult>;
}
