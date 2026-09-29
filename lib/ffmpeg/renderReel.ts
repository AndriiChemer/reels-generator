import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { getFinalReelOutputPath, toOutputRelativePath } from "@/lib/files/media";
import { resolveOutputMediaPath } from "@/lib/files/media";
import type { ReelScene } from "@/lib/types/reel";

type RenderReelInput = {
  reelId: string;
  scenes: ReelScene[];
  backgroundAudioPath?: string;
};

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const OUTPUT_FPS = 30;

export async function renderReel({
  reelId,
  scenes,
  backgroundAudioPath,
}: RenderReelInput) {
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
  const sceneAudioPaths = completedScenes.map((scene) =>
    scene.audioOutput?.outputPath
      ? resolveOutputMediaPath(scene.audioOutput.outputPath)
      : undefined,
  );
  const resolvedBackgroundAudioPath = backgroundAudioPath
    ? resolveOutputMediaPath(backgroundAudioPath)
    : undefined;
  const outputPath = getFinalReelOutputPath(reelId);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg(
    buildFfmpegArgs({
      backgroundAudioPath: resolvedBackgroundAudioPath,
      outputPath,
      sceneAudioPaths,
      sceneDurations: completedScenes.map((scene) => scene.durationSeconds),
      sceneVideoPaths: inputPaths,
    }),
  );

  return toOutputRelativePath(outputPath);
}

function buildFfmpegArgs({
  backgroundAudioPath,
  outputPath,
  sceneAudioPaths,
  sceneDurations,
  sceneVideoPaths,
}: {
  backgroundAudioPath?: string;
  outputPath: string;
  sceneAudioPaths: Array<string | undefined>;
  sceneDurations: number[];
  sceneVideoPaths: string[];
}) {
  const inputArgs = [
    ...sceneVideoPaths.flatMap((inputPath) => ["-i", inputPath]),
    ...(backgroundAudioPath
      ? ["-stream_loop", "-1", "-i", backgroundAudioPath]
      : []),
    ...sceneAudioPaths.flatMap((inputPath) =>
      inputPath ? ["-i", inputPath] : [],
    ),
  ];
  const videoFilters = sceneVideoPaths
    .map(
      (_inputPath, index) =>
        `[${index}:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,` +
        `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${OUTPUT_FPS},setsar=1[v${index}]`,
    )
    .join(";");
  const sceneAudioInputIndexes = getSceneAudioInputIndexes({
    backgroundAudioPath,
    sceneAudioPaths,
    sceneVideoPaths,
  });
  const sceneAudioFilters = sceneDurations
    .map((durationSeconds, index) =>
      buildSceneAudioFilter({
        durationSeconds,
        inputIndex: sceneAudioInputIndexes[index],
        sceneIndex: index,
      }),
    )
    .join(";");
  const concatInputs = sceneVideoPaths
    .map((_inputPath, index) => `[v${index}][a${index}]`)
    .join("");
  const concatFilter = `${concatInputs}concat=n=${sceneVideoPaths.length}:v=1:a=1[v][scene-audio]`;
  const audioMixFilter = buildAudioMixFilter({
    backgroundAudioPath,
    backgroundInputIndex: backgroundAudioPath ? sceneVideoPaths.length : undefined,
    totalDurationSeconds: sceneDurations.reduce(
      (total, durationSeconds) => total + durationSeconds,
      0,
    ),
  });
  const filterComplex = [
    videoFilters,
    sceneAudioFilters,
    concatFilter,
    audioMixFilter,
  ].join(";");

  return [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filterComplex,
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "20",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    outputPath,
  ];
}

function getSceneAudioInputIndexes({
  backgroundAudioPath,
  sceneAudioPaths,
  sceneVideoPaths,
}: {
  backgroundAudioPath?: string;
  sceneAudioPaths: Array<string | undefined>;
  sceneVideoPaths: string[];
}) {
  let nextInputIndex = sceneVideoPaths.length + (backgroundAudioPath ? 1 : 0);

  return sceneAudioPaths.map((audioPath) => {
    if (!audioPath) {
      return undefined;
    }

    const inputIndex = nextInputIndex;
    nextInputIndex += 1;

    return inputIndex;
  });
}

function buildSceneAudioFilter({
  durationSeconds,
  inputIndex,
  sceneIndex,
}: {
  durationSeconds: number;
  inputIndex?: number;
  sceneIndex: number;
}) {
  const duration = formatDuration(durationSeconds);
  const source =
    typeof inputIndex === "number"
      ? `[${inputIndex}:a]aresample=48000,apad=whole_dur=${duration},atrim=duration=${duration},asetpts=N/SR/TB`
      : `anullsrc=r=48000:cl=stereo,atrim=duration=${duration},asetpts=N/SR/TB`;

  return `${source}[a${sceneIndex}]`;
}

function buildAudioMixFilter({
  backgroundAudioPath,
  backgroundInputIndex,
  totalDurationSeconds,
}: {
  backgroundAudioPath?: string;
  backgroundInputIndex?: number;
  totalDurationSeconds: number;
}) {
  if (!backgroundAudioPath || typeof backgroundInputIndex !== "number") {
    return "[scene-audio]anull[a]";
  }

  const duration = formatDuration(totalDurationSeconds);

  return [
    `[${backgroundInputIndex}:a]aresample=48000,apad=whole_dur=${duration},atrim=duration=${duration},asetpts=N/SR/TB,volume=0.22[background]`,
    "[scene-audio][background]amix=inputs=2:duration=first:dropout_transition=0[a]",
  ].join(";");
}

function formatDuration(value: number) {
  return Math.max(0.01, Math.round(value * 1000) / 1000).toFixed(3);
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
