/** Browser URL for a file inside outputs/. Safe to import in client code. */
export function toMediaUrl(outputPath: string, version?: string) {
  const encodedPath = outputPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const cacheKey = version ? `?v=${encodeURIComponent(version)}` : "";

  return `/api/media/${encodedPath}${cacheKey}`;
}
