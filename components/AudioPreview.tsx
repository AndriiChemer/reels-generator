import { toMediaUrl } from "@/lib/media-url";

type AudioPreviewProps = {
  outputPath?: string;
  version?: string;
};

export function AudioPreview({ outputPath, version }: AudioPreviewProps) {
  if (!outputPath) {
    return null;
  }

  return (
    <audio
      className="mt-3 w-full"
      controls
      key={`${outputPath}-${version || "current"}`}
      preload="metadata"
      src={toMediaUrl(outputPath, version)}
    />
  );
}
