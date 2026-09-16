export type VideoProviderName = "fal";

export type GenerationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type GenerationMetadata = {
  id: string;
  reelId: string;
  sceneId: string;
  provider: VideoProviderName;
  model: string;
  status: GenerationStatus;
  durationSeconds: number;
  estimatedCostUsd?: number;
  temporaryVideoUrl?: string;
  outputPath?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
