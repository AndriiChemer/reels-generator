type VideoPreviewProps = {
  outputPath?: string;
};

export function VideoPreview({ outputPath }: VideoPreviewProps) {
  if (!outputPath) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-[var(--border)] bg-black">
      <video
        className="aspect-[9/16] max-h-[32rem] w-full bg-black object-contain"
        controls
        playsInline
        preload="metadata"
        src={toMediaUrl(outputPath)}
      />
    </div>
  );
}

function toMediaUrl(outputPath: string) {
  const normalizedPath = outputPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/media/${normalizedPath}`;
}
