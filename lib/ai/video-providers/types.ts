import type {
  GenerationStatus,
  VideoProviderName,
} from "@/lib/types/generation";

export type VideoGenerationInput = {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16";
  characterReferencePaths?: string[];
  assetReferencePaths?: string[];
  negativePrompt?: string;
  seed?: number;
  extraInput?: Record<string, unknown>;
};

export type VideoGenerationResult = {
  provider: VideoProviderName;
  model: string;
  generationId: string;
  status: GenerationStatus;
  temporaryVideoUrl?: string;
  errorMessage?: string;
  estimatedCostUsd?: number;
  rawResponse?: unknown;
};

export interface VideoProvider {
  generateVideo(input: VideoGenerationInput): Promise<VideoGenerationResult>;
  getGenerationStatus(generationId: string): Promise<VideoGenerationResult>;
}
