import { toMediaUrl } from "@/lib/media-url";

type VideoPreviewProps = {
  outputPath?: string;
  version?: string;
  posterPath?: string;
  posterVersion?: string;
};

export function VideoPreview({
  outputPath,
  version,
  posterPath,
  posterVersion,
}: VideoPreviewProps) {
  if (!outputPath) {
    return null;
  }

  return (
    <video
      className="aspect-[9/16] w-full rounded-md bg-black object-contain"
      controls
      key={`${outputPath}-${version || "current"}`}
      playsInline
      poster={posterPath ? toMediaUrl(posterPath, posterVersion) : undefined}
      preload="metadata"
      src={toMediaUrl(outputPath, version)}
    />
  );
}
