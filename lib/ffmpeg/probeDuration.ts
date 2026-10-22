import { spawn } from "node:child_process";

/** Media duration in seconds via ffprobe, or undefined if it is not available. */
export function probeDurationSeconds(filePath: string) {
  return new Promise<number | undefined>((resolve) => {
    const childProcess = spawn(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", filePath],
      { shell: false, stdio: ["ignore", "pipe", "ignore"] },
    );
    let stdout = "";

    childProcess.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    childProcess.on("error", () => resolve(undefined));
    childProcess.on("close", () => {
      const duration = Number.parseFloat(stdout.trim());

      resolve(Number.isFinite(duration) ? Math.round(duration * 100) / 100 : undefined);
    });
  });
}
