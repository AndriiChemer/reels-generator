export type ImageProviderName = "fal";

export type ImageGenerationInput = {
  prompt: string;
  aspectRatio: "9:16";
  /** Project image paths (references/... or outputs paths), in prompt order. */
  referenceImagePaths: string[];
  seed?: number;
};

export type ImageGenerationResult = {
  provider: ImageProviderName;
  model: string;
  /** Temporary provider URL. Download it right away. */
  imageUrl: string;
  estimatedCostUsd?: number;
};

export interface ImageProvider {
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationResult>;
}
