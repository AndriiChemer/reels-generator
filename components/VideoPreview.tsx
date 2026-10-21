type VideoPreviewProps = {
  outputPath?: string;
  version?: string;
};

export function VideoPreview({ outputPath, version }: VideoPreviewProps) {
  if (!outputPath) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-[var(--border)] bg-black">
      <video
        className="aspect-[9/16] max-h-[32rem] w-full bg-black object-contain"
        controls
        key={`${outputPath}-${version || "current"}`}
        playsInline
        preload="metadata"
        src={toMediaUrl(outputPath, version)}
      />
    </div>
  );
}

function toMediaUrl(outputPath: string, version?: string) {
  const normalizedPath = outputPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const cacheKey = version ? `?v=${encodeURIComponent(version)}` : "";

  return `/api/media/${normalizedPath}${cacheKey}`;
}
