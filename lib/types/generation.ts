export type VideoProviderName = "fal";

export type GenerationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type GenerationLogEntry = {
  createdAt: string;
  message: string;
};

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
  providerStatusUrl?: string;
  providerResponseUrl?: string;
  outputPath?: string;
  errorMessage?: string;
  progressMessage?: string;
  activityLog?: GenerationLogEntry[];
  createdAt: string;
  updatedAt: string;
};
