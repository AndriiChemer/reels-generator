type AudioPreviewProps = {
  outputPath?: string;
};

export function AudioPreview({ outputPath }: AudioPreviewProps) {
  if (!outputPath) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-[var(--border)] pt-4">
      <p className="text-sm font-medium">SFX preview</p>
      <audio className="mt-2 w-full" controls preload="metadata" src={toMediaUrl(outputPath)} />
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
