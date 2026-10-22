"use client";

import { SceneAudioPanel } from "@/components/SceneAudioPanel";
import { ErrorText, SmallButton } from "@/components/ui";
import { useGenerationPolling } from "@/components/useGenerationPolling";
import { VideoPreview } from "@/components/VideoPreview";
import { toMediaUrl } from "@/lib/media-url";
import {
  hasVideo,
  getKeyframeOutdatedReason,
  isVideoInProgress,
  isVideoOutdated,
} from "@/lib/scene-status";
import type { SceneWarning } from "@/lib/scenes";
import type { GenerationMetadata } from "@/lib/types/generation";
import type { ReelDraft, ReelScene } from "@/lib/types/reel";

export type SceneTask = "keyframe" | "video" | "audio";

type SceneCardProps = {
  reel: ReelDraft;
  scene: ReelScene;
  previousScene?: ReelScene;
  generation?: GenerationMetadata;
  runningTask?: SceneTask;
  error?: string;
  warning?: SceneWarning;
  isBatchRunning: boolean;
  onAcceptKeyframe: () => void;
  onGenerateKeyframe: () => void;
  onGenerateVideo: () => void;
  onGenerationUpdate: (generation: GenerationMetadata) => void;
  onSceneChange: (patch: Partial<ReelScene>) => void;
};

/** One storyboard frame: keyframe → video, with sound in the details. */
export function SceneCard({
  reel,
  scene,
  previousScene,
  generation,
  runningTask,
  error,
  warning,
  isBatchRunning,
  onAcceptKeyframe,
  onGenerateKeyframe,
  onGenerateVideo,
  onGenerationUpdate,
  onSceneChange,
}: SceneCardProps) {
  useGenerationPolling(generation, onGenerationUpdate);

  const isBusy = Boolean(runningTask) || isBatchRunning;
  const isRendering = isVideoInProgress(scene) || runningTask === "video";
  const notes = getSceneNotes(scene, previousScene, reel, warning);
  const isKeyframeOutdated =
    getKeyframeOutdatedReason(scene, previousScene, reel) !== null;

  return (
    <article className="grid min-w-0 content-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
      <header className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold">Сцена {scene.order}</span>
        <span className="flex gap-1.5 text-xs text-[var(--muted)]">
          {scene.transition === "continue" ? (
            <Badge title="Без склейки з попередньою сценою">↪ продовження</Badge>
          ) : null}
          <Badge>{scene.durationSeconds} с</Badge>
        </span>
      </header>

      <SceneThumbnail
        isRendering={isRendering}
        videoVersion={generation?.updatedAt}
        progressMessage={formatProgress(generation)}
        runningTask={runningTask}
        scene={scene}
      />

      <CharacterChips scene={scene} warning={warning} />

      <div className="grid grid-cols-2 gap-2">
        <SmallButton
          disabled={isBusy}
          onClick={onGenerateKeyframe}
        >
          {runningTask === "keyframe"
            ? "Малюємо…"
            : scene.keyframe
              ? "Новий кадр"
              : "Кадр"}
        </SmallButton>
        <SmallButton
          disabled={isBusy || isRendering || !scene.keyframe}
          onClick={onGenerateVideo}
          variant="primary"
        >
          {isRendering ? "Генерується…" : hasVideo(scene) ? "Нове відео" : "Відео"}
        </SmallButton>
      </div>

      {notes.map((note) => (
        <p className="text-xs leading-5 text-amber-800" key={note}>
          {note}
        </p>
      ))}
      {isKeyframeOutdated ? (
        <button
          className="w-fit text-xs font-semibold text-[var(--accent-strong)] underline-offset-2 hover:underline disabled:opacity-50"
          disabled={isBusy}
          onClick={onAcceptKeyframe}
          type="button"
        >
          Залишити цей кадр
        </button>
      ) : null}
      <ErrorText message={error || (scene.status === "failed" ? generation?.errorMessage : "")} />

      <details className="text-sm">
        <summary className="cursor-pointer font-medium text-[var(--accent-strong)]">
          Опис і звук
        </summary>
        <div className="mt-3 grid gap-3">
          <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--muted)]">
            {scene.videoPrompt}
          </p>
          {scene.keyframe ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--muted)]">
                Промпт кадру
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-2 font-mono text-[11px] leading-4 text-[var(--muted)]">
                {scene.keyframe.prompt}
              </pre>
            </details>
          ) : null}
          <SceneAudioPanel
            onSceneChange={onSceneChange}
            reelId={reel.id}
            scene={scene}
          />
        </div>
      </details>
    </article>
  );
}

function SceneThumbnail({
  isRendering,
  progressMessage,
  runningTask,
  scene,
  videoVersion,
}: {
  isRendering: boolean;
  progressMessage?: string;
  runningTask?: SceneTask;
  scene: ReelScene;
  videoVersion?: string;
}) {
  if (hasVideo(scene) && !isRendering) {
    return (
      <VideoPreview
        outputPath={scene.outputPath}
        posterPath={scene.keyframe?.outputPath}
        posterVersion={scene.keyframe?.generatedAt}
        version={videoVersion}
      />
    );
  }

  const overlay =
    runningTask === "keyframe"
      ? "Створюємо кадр…"
      : isRendering
        ? progressMessage || "Генеруємо відео…"
        : "";

  return (
    <div className="relative grid aspect-[9/16] w-full place-items-center overflow-hidden rounded-md bg-slate-100">
      {scene.keyframe ? (
        // eslint-disable-next-line @next/next/no-img-element -- local media route, no optimisation needed
        <img
          alt={`Кадр сцени ${scene.order}`}
          className="h-full w-full object-cover"
          src={toMediaUrl(scene.keyframe.outputPath, scene.keyframe.generatedAt)}
        />
      ) : (
        <span className="px-4 text-center text-xs text-[var(--muted)]">
          Кадру ще немає
        </span>
      )}
      {overlay ? (
        <span className="absolute inset-x-2 bottom-2 rounded-md bg-black/70 px-2 py-1.5 text-center text-xs text-white">
          {overlay}
        </span>
      ) : null}
    </div>
  );
}

function CharacterChips({
  scene,
  warning,
}: {
  scene: ReelScene;
  warning?: SceneWarning;
}) {
  const unknownNames = new Set(
    [
      ...(warning?.unknownCharacterNames ?? []),
      ...(warning?.unknownReferenceNames ?? []),
    ].map((name) => name.toLowerCase()),
  );
  const mentions = [
    ...scene.characterNames.map((name) => `@${name}`),
    ...scene.referenceNames.map((name) => `#${name}`),
  ];

  if (mentions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {mentions.map((mention) => {
        const isUnknown = unknownNames.has(mention.slice(1).toLowerCase());

        return (
          <span
            className={
              isUnknown
                ? "rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-800"
                : "rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-xs text-teal-800"
            }
            key={mention}
            title={isUnknown ? "Не знайдено серед персонажів і референсів" : undefined}
          >
            {mention}
          </span>
        );
      })}
    </div>
  );
}

function Badge({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="rounded border border-[var(--border)] px-1.5 py-0.5" title={title}>
      {children}
    </span>
  );
}

/** "Провайдер генерує відео · 8 хв" — server timestamps, so no clock in render. */
function formatProgress(generation: GenerationMetadata | undefined) {
  if (!generation?.progressMessage) {
    return undefined;
  }

  const minutes = Math.floor(
    (Date.parse(generation.updatedAt) - Date.parse(generation.createdAt)) / 60_000,
  );

  return minutes > 0
    ? `${generation.progressMessage} · ${minutes} хв`
    : generation.progressMessage;
}

function getSceneNotes(
  scene: ReelScene,
  previousScene: ReelScene | undefined,
  reel: ReelDraft,
  warning: SceneWarning | undefined,
) {
  const notes: string[] = [];

  if (warning) {
    notes.push("Деякі @/# не знайдено — для них не буде референсу.");
  }

  const outdatedReason = getKeyframeOutdatedReason(scene, previousScene, reel);

  if (outdatedReason === "look") {
    notes.push("Вигляд рілса змінився — онови кадр.");
  }

  if (outdatedReason === "previous") {
    notes.push("Кадр попередньої сцени змінився — онови цей кадр для цілісності.");
  }

  if (isVideoOutdated(scene)) {
    notes.push("Відео зроблене зі старого кадру.");
  }

  return notes;
}
