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
/**
 * One shared grade for every scene: AI clips come out with slightly
 * different contrast and color, a common grade and light grain glue them.
 */
const FILM_LOOK_FILTER =
  "eq=contrast=1.04:saturation=0.94:gamma=0.98,noise=alls=4:allf=t";

/**
 * Mix levels. The voice leads, SFX sit a bit lower, music is a quiet bed that
 * ducks further while someone speaks. The master is normalized to -14 LUFS,
 * the loudness Instagram and TikTok play at.
 */
const VOICE_VOLUME = 1;
const SFX_VOLUME = 0.7;
const MUSIC_VOLUME = 0.35;
const AUDIO_FORMAT = "aformat=sample_rates=48000:channel_layouts=stereo";
const MUSIC_DUCKING_FILTER =
  "sidechaincompress=threshold=0.02:ratio=6:attack=20:release=400";
const LOUDNESS_FILTER = "loudnorm=I=-14:TP=-1.5:LRA=11";

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
      sceneFilmLooks: completedScenes.map((scene) => scene.videoSource !== "clip"),
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
      withFilmLook: scene.videoSource !== "clip",
    }),
  );

  return toOutputRelativePath(outputPath);
}

type VoiceoverInput = {
  path: string;
  speechRate: number;
  speedAppliedNatively: boolean;
  startSeconds: number;
};

/**
 * Final reel: videos are concatenated with their scene SFX, voice lines are
 * placed on one reel-wide timeline (a line may run into the next scene),
 * music ducks under the voice and the result is normalized for Reels.
 */
function buildFfmpegArgs({
  backgroundAudioPath,
  outputPath,
  sceneAudioPaths,
  sceneVoiceoverInputs,
  sceneDurations,
  sceneFilmLooks,
  sceneVideoPaths,
}: {
  backgroundAudioPath?: string;
  outputPath: string;
  sceneAudioPaths: Array<string | undefined>;
  sceneVoiceoverInputs: Array<VoiceoverInput | undefined>;
  sceneDurations: number[];
  /** false for library clips: brand assets keep their exact colors. */
  sceneFilmLooks: boolean[];
  sceneVideoPaths: string[];
}) {
  const inputArgs: string[] = [];
  let inputCount = 0;
  const addInput = (args: string[]) => {
    inputArgs.push(...args);
    return inputCount++;
  };

  const videoInputs = sceneVideoPaths.map((videoPath) => addInput(["-i", videoPath]));
  const musicInput = backgroundAudioPath
    ? addInput(["-stream_loop", "-1", "-i", backgroundAudioPath])
    : undefined;
  const sfxInputs = sceneAudioPaths.map((audioPath) =>
    audioPath ? addInput(["-i", audioPath]) : undefined,
  );
  const voiceInputs = sceneVoiceoverInputs.map((voiceover) =>
    voiceover ? addInput(["-i", voiceover.path]) : undefined,
  );

  const totalSeconds = sceneDurations.reduce((total, duration) => total + duration, 0);
  const sceneStarts = sceneDurations.map((_duration, index) =>
    sceneDurations.slice(0, index).reduce((total, duration) => total + duration, 0),
  );

  const videoFilters = videoInputs.map((inputIndex, index) =>
    buildSceneVideoFilter(inputIndex, `v${index}`, sceneDurations[index], sceneFilmLooks[index]),
  );
  const sfxFilters = sceneDurations.map((durationSeconds, index) =>
    buildSfxTrack(sfxInputs[index], durationSeconds, `a${index}`),
  );
  const concatFilter =
    videoInputs.map((_inputIndex, index) => `[v${index}][a${index}]`).join("") +
    `concat=n=${videoInputs.length}:v=1:a=1[v][sfx]`;
  const voiceClips = sceneVoiceoverInputs.flatMap((voiceover, index) => {
    const inputIndex = voiceInputs[index];

    return voiceover && inputIndex !== undefined
      ? [
          {
            label: `vo${index}`,
            filter: buildVoiceClip(
              inputIndex,
              voiceover,
              sceneStarts[index] + voiceover.startSeconds,
              `vo${index}`,
            ),
          },
        ]
      : [];
  });

  const filterComplex = [
    ...videoFilters,
    ...sfxFilters,
    concatFilter,
    ...voiceClips.map((clip) => clip.filter),
    buildVoiceBus(voiceClips.map((clip) => clip.label), totalSeconds),
    buildFinalMix(musicInput, totalSeconds),
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

/** SFX of one scene, padded or trimmed to the scene length. */
function buildSfxTrack(
  inputIndex: number | undefined,
  durationSeconds: number,
  outputLabel: string,
) {
  const duration = formatDuration(durationSeconds);

  return inputIndex === undefined
    ? `anullsrc=r=48000:cl=stereo,atrim=duration=${duration}[${outputLabel}]`
    : `[${inputIndex}:a]${AUDIO_FORMAT},apad=whole_dur=${duration},atrim=duration=${duration},` +
        `asetpts=N/SR/TB,volume=${SFX_VOLUME}[${outputLabel}]`;
}

/** One voice line placed at its absolute time in the reel. */
function buildVoiceClip(
  inputIndex: number,
  voiceover: VoiceoverInput,
  reelSeconds: number,
  outputLabel: string,
) {
  const delayMilliseconds = Math.max(0, Math.round(reelSeconds * 1000));
  const tempoFilter = voiceover.speedAppliedNatively
    ? ""
    : `atempo=${formatSpeechRate(voiceover.speechRate)},`;

  return (
    `[${inputIndex}:a]${AUDIO_FORMAT},asetpts=N/SR/TB,${tempoFilter}` +
    `adelay=${delayMilliseconds}:all=1,volume=${VOICE_VOLUME}[${outputLabel}]`
  );
}

/** All voice lines on one track as long as the reel. */
function buildVoiceBus(clipLabels: string[], totalSeconds: number) {
  const duration = formatDuration(totalSeconds);
  const fitToReel = `apad=whole_dur=${duration},atrim=duration=${duration}`;

  if (clipLabels.length === 0) {
    return `anullsrc=r=48000:cl=stereo,atrim=duration=${duration}[voice]`;
  }

  const inputs = clipLabels.map((label) => `[${label}]`).join("");

  return clipLabels.length === 1
    ? `${inputs}${fitToReel}[voice]`
    : `${inputs}amix=inputs=${clipLabels.length}:duration=longest:normalize=0,${fitToReel}[voice]`;
}

/** SFX + voice + music (ducked under the voice), loudness-normalized. */
function buildFinalMix(musicInput: number | undefined, totalSeconds: number) {
  const master = `${LOUDNESS_FILTER},${AUDIO_FORMAT}[a]`;

  if (musicInput === undefined) {
    return `[sfx][voice]amix=inputs=2:duration=first:normalize=0,${master}`;
  }

  const duration = formatDuration(totalSeconds);

  return [
    `[${musicInput}:a]${AUDIO_FORMAT},apad=whole_dur=${duration},atrim=duration=${duration},` +
      `asetpts=N/SR/TB,volume=${MUSIC_VOLUME}[music-raw]`,
    "[voice]asplit=2[voice-mix][voice-key]",
    `[music-raw][voice-key]${MUSIC_DUCKING_FILTER}[music]`,
    `[sfx][voice-mix][music]amix=inputs=3:duration=first:normalize=0,${master}`,
  ].join(";");
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
      ? `[${inputIndex}:a]${AUDIO_FORMAT},apad=whole_dur=${duration},atrim=duration=${duration},asetpts=N/SR/TB,volume=${SFX_VOLUME}[sfx${sceneIndex}]`
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
    `[${voiceoverInputIndex}:a]${AUDIO_FORMAT},asetpts=N/SR/TB,` +
    voiceoverTempoFilter +
    `adelay=${delayMilliseconds}:all=1,apad=whole_dur=${duration},` +
    `atrim=duration=${duration}[voice${sceneIndex}]`;

  return [
    sceneAudioSource,
    voiceoverSource,
    `[sfx${sceneIndex}][voice${sceneIndex}]amix=inputs=2:duration=first:normalize=0[a${sceneIndex}]`,
  ].join(";");
}

function buildScenePreviewArgs({
  outputPath,
  sceneAudioPath,
  sceneDurationSeconds,
  videoPath,
  voiceoverInput,
  withFilmLook,
}: {
  outputPath: string;
  sceneAudioPath?: string;
  sceneDurationSeconds: number;
  videoPath: string;
  voiceoverInput?: VoiceoverInput;
  withFilmLook: boolean;
}) {
  const sceneAudioInputIndex = sceneAudioPath ? 1 : undefined;
  const voiceoverInputIndex = voiceoverInput
    ? sceneAudioPath
      ? 2
      : 1
    : undefined;
  const duration = formatDuration(sceneDurationSeconds);
  const videoFilter = buildSceneVideoFilter(0, "v", sceneDurationSeconds, withFilmLook);
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

/**
 * One scene video: exactly the scene length (Kling returns e.g. 4.042 s for
 * "4", and those extra frames would push the picture out of sync with the
 * voice), vertical 1080×1920, optional shared grade.
 */
function buildSceneVideoFilter(
  inputIndex: number,
  outputLabel: string,
  durationSeconds: number,
  withFilmLook = true,
) {
  const duration = formatDuration(durationSeconds);

  return (
    `[${inputIndex}:v]tpad=stop_mode=clone:stop_duration=1,trim=duration=${duration},setpts=PTS-STARTPTS,` +
    `scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,` +
    `crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${OUTPUT_FPS},setsar=1` +
    `${withFilmLook ? `,${FILM_LOOK_FILTER}` : ""}[${outputLabel}]`
  );
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
