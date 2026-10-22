import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Turns any library clip into a scene video: 1080×1920, 30 fps, exactly the
 * scene length (the last frame is held if the clip is shorter), no audio.
 */
export async function prepareClipForScene({
  inputPath,
  outputPath,
  durationSeconds,
}: {
  inputPath: string;
  outputPath: string;
  durationSeconds: number;
}) {
  const duration = durationSeconds.toFixed(3);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg([
    "-y",
    "-i",
    inputPath,
    "-vf",
    "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1," +
      `tpad=stop_mode=clone:stop_duration=${duration}`,
    "-t",
    duration,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "18",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const childProcess = spawn("ffmpeg", args, {
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    childProcess.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    childProcess.on("error", (error) => reject(error));
    childProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.split("\n").filter(Boolean).slice(-4).join("\n")));
    });
  });
}
