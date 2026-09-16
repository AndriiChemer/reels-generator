import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getFinalReelOutputPath, toOutputRelativePath } from "@/lib/files/media";
import { resolveOutputMediaPath } from "@/lib/files/media";
import type { ReelScene } from "@/lib/types/reel";

type RenderReelInput = {
  reelId: string;
  scenes: ReelScene[];
};

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const OUTPUT_FPS = 30;

export async function renderReel({ reelId, scenes }: RenderReelInput) {
  const completedScenes = scenes
    .filter((scene) => scene.status === "completed" && scene.outputPath)
    .sort((left, right) => left.order - right.order);

  if (completedScenes.length === 0) {
    throw new Error("Немає completed сцен з локальним MP4.");
  }

  if (completedScenes.length !== scenes.length) {
    throw new Error("Спершу згенеруй локальний MP4 для кожної сцени.");
  }

  const inputPaths = completedScenes.map((scene) =>
    resolveOutputMediaPath(scene.outputPath as string),
  );
  const outputPath = getFinalReelOutputPath(reelId);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg(buildFfmpegArgs(inputPaths, outputPath));

  return toOutputRelativePath(outputPath);
}

function buildFfmpegArgs(inputPaths: string[], outputPath: string) {
  const inputArgs = inputPaths.flatMap((inputPath) => ["-i", inputPath]);
  const videoFilters = inputPaths
    .map(
      (_inputPath, index) =>
        `[${index}:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,` +
        `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${OUTPUT_FPS},setsar=1[v${index}]`,
    )
    .join(";");
  const concatInputs = inputPaths.map((_inputPath, index) => `[v${index}]`).join("");
  const filterComplex = `${videoFilters};${concatInputs}concat=n=${inputPaths.length}:v=1:a=0[v]`;

  return [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath,
  ];
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

    childProcess.on("error", (error) => {
      reject(
        new Error(
          error.message ||
            "Не вдалося запустити FFmpeg. Перевір, що він встановлений.",
        ),
      );
    });

    childProcess.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }

      reject(new Error(readUsefulFfmpegError(stderr)));
    });
  });
}

function readUsefulFfmpegError(stderr: string) {
  const lines = stderr
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const tail = lines.slice(-8).join("\n");

  return tail || "FFmpeg render failed.";
}
