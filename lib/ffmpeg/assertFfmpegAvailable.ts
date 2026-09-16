import { spawn } from "node:child_process";

export async function assertFfmpegAvailable() {
  const result = await runFfmpegVersion();

  if (result.exitCode !== 0) {
    throw new Error(
      result.stderr ||
        "FFmpeg не знайдено. Встанови FFmpeg і переконайся, що `ffmpeg -version` працює.",
    );
  }
}

function runFfmpegVersion() {
  return new Promise<{ exitCode: number | null; stderr: string }>((resolve) => {
    const childProcess = spawn("ffmpeg", ["-version"], {
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";

    childProcess.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    childProcess.on("error", (error) => {
      resolve({
        exitCode: 1,
        stderr:
          error.message ||
          "FFmpeg не знайдено. Встанови FFmpeg і додай його в PATH.",
      });
    });

    childProcess.on("close", (exitCode) => {
      resolve({ exitCode, stderr: stderr.trim() });
    });
  });
}
