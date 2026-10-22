import { readOutputImageAsDataUrl } from "@/lib/files/media";
import { readReferenceImageAsDataUrl } from "@/lib/references";

const REFERENCES_PREFIX = "references/";

/**
 * Reads any image the app works with as a data URL for AI providers.
 *
 * - `references/...` — character photos, app screens, logo.
 * - everything else is treated as a path inside `outputs/`, e.g. a keyframe.
 */
export function readProjectImageAsDataUrl(imagePath: string) {
  return imagePath.startsWith(REFERENCES_PREFIX)
    ? readReferenceImageAsDataUrl(imagePath)
    : readOutputImageAsDataUrl(imagePath);
}
