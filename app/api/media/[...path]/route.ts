import {
  getMediaContentType,
  readOutputMediaFile,
  resolveOutputMediaPath,
} from "@/lib/files/media";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ path: string[] }>;
  },
) {
  const { path } = await params;

  try {
    const filePath = resolveOutputMediaPath(path);
    const mediaFile = await readOutputMediaFile(path);

    return new Response(mediaFile, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Content-Length": String(mediaFile.byteLength),
        "Content-Type": getMediaContentType(filePath),
      },
    });
  } catch (error) {
    return Response.json({ error: readErrorMessage(error) }, { status: 404 });
  }
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Media file not found.";
}
