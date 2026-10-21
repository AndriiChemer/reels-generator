import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import {
  getFinalReelOutputPath,
  getScenePreviewOutputPath,
  toOutputRelativePath,
} from "@/lib/files/media";
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
  const sceneVoiceoverInputs = completedScenes.map((scene) =>
    scene.voiceoverOutput?.outputPath
      ? {
          path: resolveOutputMediaPath(scene.voiceoverOutput.outputPath),
          startSeconds: scene.voiceoverOutput.startSeconds,
          speechRate: scene.voiceoverOutput.speechRate,
          speedAppliedNatively: scene.voiceoverOutput.speedAppliedNatively ?? false,
        }
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
      sceneVoiceoverInputs,
      sceneDurations: completedScenes.map((scene) => scene.durationSeconds),
      sceneVideoPaths: inputPaths,
    }),
  );

  return toOutputRelativePath(outputPath);
}

export async function renderScenePreview({
  reelId,
  scene,
}: {
  reelId: string;
  scene: ReelScene;
}) {
  if (scene.status !== "completed" || !scene.outputPath) {
    throw new Error("Спершу згенеруй і збережи локальний MP4 сцени.");
  }

  const videoPath = resolveOutputMediaPath(scene.outputPath);
  const sceneAudioPath = scene.audioOutput?.outputPath
    ? resolveOutputMediaPath(scene.audioOutput.outputPath)
    : undefined;
  const voiceoverInput = scene.voiceoverOutput?.outputPath
    ? {
        path: resolveOutputMediaPath(scene.voiceoverOutput.outputPath),
        startSeconds: scene.voiceoverOutput.startSeconds,
        speechRate: scene.voiceoverOutput.speechRate,
        speedAppliedNatively: scene.voiceoverOutput.speedAppliedNatively ?? false,
      }
    : undefined;
  const outputPath = getScenePreviewOutputPath(reelId, scene.id);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await runFfmpeg(
    buildScenePreviewArgs({
      outputPath,
      sceneAudioPath,
      sceneDurationSeconds: scene.durationSeconds,
      videoPath,
      voiceoverInput,
    }),
  );

  return toOutputRelativePath(outputPath);
}

function buildFfmpegArgs({
  backgroundAudioPath,
  outputPath,
  sceneAudioPaths,
  sceneVoiceoverInputs,
  sceneDurations,
  sceneVideoPaths,
}: {
  backgroundAudioPath?: string;
  outputPath: string;
  sceneAudioPaths: Array<string | undefined>;
  sceneVoiceoverInputs: Array<
    | {
        path: string;
        speechRate: number;
        speedAppliedNatively: boolean;
        startSeconds: number;
      }
    | undefined
  >;
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
    ...sceneVoiceoverInputs.flatMap((input) =>
      input ? ["-i", input.path] : [],
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
  const sceneVoiceoverInputIndexes = getSceneVoiceoverInputIndexes({
    backgroundAudioPath,
    sceneAudioPaths,
    sceneVideoPaths,
    sceneVoiceoverInputs,
  });
  const sceneAudioFilters = sceneDurations
    .map((durationSeconds, index) =>
      buildSceneAudioFilter({
        durationSeconds,
        inputIndex: sceneAudioInputIndexes[index],
        sceneIndex: index,
        voiceoverInputIndex: sceneVoiceoverInputIndexes[index],
        voiceoverSpeedAppliedNatively:
          sceneVoiceoverInputs[index]?.speedAppliedNatively,
        voiceoverSpeechRate: sceneVoiceoverInputs[index]?.speechRate,
        voiceoverStartSeconds: sceneVoiceoverInputs[index]?.startSeconds,
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

function getSceneVoiceoverInputIndexes({
  backgroundAudioPath,
  sceneAudioPaths,
  sceneVideoPaths,
  sceneVoiceoverInputs,
}: {
  backgroundAudioPath?: string;
  sceneAudioPaths: Array<string | undefined>;
  sceneVideoPaths: string[];
  sceneVoiceoverInputs: Array<
    | {
        path: string;
        speechRate: number;
        speedAppliedNatively: boolean;
        startSeconds: number;
      }
    | undefined
  >;
}) {
  let nextInputIndex =
    sceneVideoPaths.length +
    (backgroundAudioPath ? 1 : 0) +
    sceneAudioPaths.filter(Boolean).length;

  return sceneVoiceoverInputs.map((input) => {
    if (!input) {
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
  voiceoverInputIndex,
  voiceoverSpeedAppliedNatively,
  voiceoverSpeechRate,
  voiceoverStartSeconds,
}: {
  durationSeconds: number;
  inputIndex?: number;
  sceneIndex: number;
  voiceoverInputIndex?: number;
  voiceoverSpeedAppliedNatively?: boolean;
  voiceoverSpeechRate?: number;
  voiceoverStartSeconds?: number;
}) {
  const duration = formatDuration(durationSeconds);
  const sceneAudioSource =
    typeof inputIndex === "number"
      ? `[${inputIndex}:a]aresample=48000,apad=whole_dur=${duration},atrim=duration=${duration},asetpts=N/SR/TB[sfx${sceneIndex}]`
      : `anullsrc=r=48000:cl=stereo,atrim=duration=${duration},asetpts=N/SR/TB[sfx${sceneIndex}]`;

  if (typeof voiceoverInputIndex !== "number") {
    return `${sceneAudioSource};[sfx${sceneIndex}]anull[a${sceneIndex}]`;
  }

  const delayMilliseconds = Math.max(
    0,
    Math.round((voiceoverStartSeconds || 0) * 1000),
  );
  const voiceoverTempoFilter = voiceoverSpeedAppliedNatively
    ? ""
    : `atempo=${formatSpeechRate(voiceoverSpeechRate)},`;
  const voiceoverSource =
    `[${voiceoverInputIndex}:a]aresample=48000,asetpts=N/SR/TB,` +
    voiceoverTempoFilter +
    `adelay=${delayMilliseconds}:all=1,apad=whole_dur=${duration},` +
    `atrim=duration=${duration}[voice${sceneIndex}]`;

  return [
    sceneAudioSource,
    voiceoverSource,
    `[sfx${sceneIndex}][voice${sceneIndex}]amix=inputs=2:duration=first:dropout_transition=0[a${sceneIndex}]`,
  ].join(";");
}

function buildScenePreviewArgs({
  outputPath,
  sceneAudioPath,
  sceneDurationSeconds,
  videoPath,
  voiceoverInput,
}: {
  outputPath: string;
  sceneAudioPath?: string;
  sceneDurationSeconds: number;
  videoPath: string;
  voiceoverInput?: {
    path: string;
    speechRate: number;
    speedAppliedNatively: boolean;
    startSeconds: number;
  };
}) {
  const sceneAudioInputIndex = sceneAudioPath ? 1 : undefined;
  const voiceoverInputIndex = voiceoverInput
    ? sceneAudioPath
      ? 2
      : 1
    : undefined;
  const duration = formatDuration(sceneDurationSeconds);
  const videoFilter =
    `[0:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${OUTPUT_FPS},setsar=1[v]`;
  const audioFilter = buildSceneAudioFilter({
    durationSeconds: sceneDurationSeconds,
    inputIndex: sceneAudioInputIndex,
    sceneIndex: 0,
    voiceoverInputIndex,
    voiceoverSpeedAppliedNatively: voiceoverInput?.speedAppliedNatively,
    voiceoverSpeechRate: voiceoverInput?.speechRate,
    voiceoverStartSeconds: voiceoverInput?.startSeconds,
  });

  return [
    "-y",
    "-i",
    videoPath,
    ...(sceneAudioPath ? ["-i", sceneAudioPath] : []),
    ...(voiceoverInput ? ["-i", voiceoverInput.path] : []),
    "-filter_complex",
    `${videoFilter};${audioFilter}`,
    "-map",
    "[v]",
    "-map",
    "[a0]",
    "-t",
    duration,
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

function formatSpeechRate(value: number | undefined) {
  const rate = typeof value === "number" ? value : 1;

  return Math.min(Math.max(rate, 0.5), 2).toFixed(3);
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
