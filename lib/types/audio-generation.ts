export type AudioProviderName = "elevenlabs";

export type AudioOutputExtension = "mp3" | "wav" | "pcm" | "opus" | "ulaw" | "alaw";

export type AudioGenerationInput = {
  prompt: string;
  durationSeconds: number;
  loop?: boolean;
  model?: string;
  outputFormat?: string;
  promptInfluence?: number;
};

export type MusicGenerationInput = {
  prompt: string;
  durationSeconds: number;
  model?: string;
  outputFormat?: string;
};

export type AudioGenerationResult = {
  provider: AudioProviderName;
  model: string;
  audioBytes: ArrayBuffer;
  contentType: string;
  extension: AudioOutputExtension;
  outputFormat: string;
  durationSeconds: number;
  characterCost?: number;
  rawResponseHeaders?: Record<string, string>;
};
