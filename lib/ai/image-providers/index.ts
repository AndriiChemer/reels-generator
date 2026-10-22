import { createFalImageProvider } from "@/lib/ai/image-providers/fal";
import type { ImageProvider } from "@/lib/ai/image-providers/types";

export function getImageProvider(): ImageProvider {
  return createFalImageProvider();
}

export type {
  ImageGenerationInput,
  ImageGenerationResult,
  ImageProvider,
} from "@/lib/ai/image-providers/types";
