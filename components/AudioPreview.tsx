type AudioPreviewProps = {
  outputPath?: string;
  version?: string;
};

export function AudioPreview({ outputPath, version }: AudioPreviewProps) {
  if (!outputPath) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <p className="text-sm font-medium">SFX preview</p>
      <audio
        className="mt-2 w-full"
        controls
        key={`${outputPath}-${version || "current"}`}
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
