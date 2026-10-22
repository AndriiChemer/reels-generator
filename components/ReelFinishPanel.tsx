"use client";

import { useState } from "react";
import { AudioPreview } from "@/components/AudioPreview";
import { hasSoundEffects } from "@/components/SceneAudioPanel";
import type { BatchTask } from "@/components/SceneEditor";
import { ErrorText, Panel, SmallButton } from "@/components/ui";
import { usePostRequest } from "@/components/usePostRequest";
import { VideoPreview } from "@/components/VideoPreview";
import { calculateGenerationCostSummary, formatUsd } from "@/lib/costs";
import { VOICE_MOODS, getReelVoiceSettings } from "@/lib/voice";
import { getReelDurationSeconds, hasVideo } from "@/lib/scene-status";
import type { GenerationMetadata } from "@/lib/types/generation";
import type {
  ReelBackgroundAudioOutput,
  ReelDraft,
  ReelScene,
} from "@/lib/types/reel";

/** Last step: sound for the whole reel, final MP4 and the cost estimate. */
export function ReelFinishPanel({
  batchTask,
  generations,
  onGenerateSoundEffects,
  onGenerateVoiceovers,
  reel,
  scenes,
}: {
  batchTask: BatchTask | null;
  generations: GenerationMetadata[];
  onGenerateSoundEffects: () => void;
  onGenerateVoiceovers: () => void;
  reel: ReelDraft;
  scenes: ReelScene[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <SceneSoundPanel
          batchTask={batchTask}
          onGenerateSoundEffects={onGenerateSoundEffects}
          onGenerateVoiceovers={onGenerateVoiceovers}
          reel={reel}
          scenes={scenes}
        />
        <MusicPanel reel={reel} scenes={scenes} />
        <CostPanel generations={generations} scenes={scenes} />
      </div>
      <FinalRenderPanel reel={reel} scenes={scenes} />
    </div>
  );
}

function SceneSoundPanel({
  batchTask,
  onGenerateSoundEffects,
  onGenerateVoiceovers,
  reel,
  scenes,
}: {
  batchTask: BatchTask | null;
  onGenerateSoundEffects: () => void;
  onGenerateVoiceovers: () => void;
  reel: ReelDraft;
  scenes: ReelScene[];
}) {
  const voiceScenes = scenes.filter((scene) => scene.audioPlan.voicePrompt);
  const voicedCount = voiceScenes.filter((scene) => scene.voiceoverOutput).length;
  const sfxScenes = scenes.filter(hasSoundEffects);
  const sfxCount = sfxScenes.filter((scene) => scene.audioOutput).length;
  const voice = getReelVoiceSettings(reel);

  return (
    <Panel>
      <h2 className="text-lg font-semibold">Голос і звуки сцен</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Голос: {VOICE_MOODS[voice.mood].label.toLowerCase()}, темп {voice.speed}×.
        Змінюється у «Сценарій і вигляд».
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <SmallButton
          disabled={batchTask !== null || voiceScenes.length === 0}
          onClick={onGenerateVoiceovers}
        >
          {batchTask === "voiceovers"
            ? "Озвучуємо…"
            : `Озвучити всі репліки · ${voicedCount}/${voiceScenes.length}`}
        </SmallButton>
        <SmallButton
          disabled={batchTask !== null || sfxCount === sfxScenes.length}
          onClick={onGenerateSoundEffects}
        >
          {batchTask === "soundEffects"
            ? "Створюємо SFX…"
            : `Створити SFX · ${sfxCount}/${sfxScenes.length}`}
        </SmallButton>
      </div>
    </Panel>
  );
}

function MusicPanel({ reel, scenes }: { reel: ReelDraft; scenes: ReelScene[] }) {
  const [music, setMusic] = useState(reel.backgroundAudio);
  const request = usePostRequest<{ backgroundAudio: ReelBackgroundAudioOutput }>();
  const durationSeconds = getReelDurationSeconds(scenes);
  const isMusicTooShort = Boolean(
    music && music.durationSeconds < durationSeconds,
  );

  async function handleGenerate() {
    const payload = await request.send(`/api/reels/${reel.id}/audio/music/generate`);

    if (payload) {
      setMusic(payload.backgroundAudio);
    }
  }

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Фонова музика</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Одна доріжка на весь рілс · {durationSeconds} с
          </p>
        </div>
        <SmallButton disabled={request.isPending} onClick={handleGenerate}>
          {request.isPending ? "Генерація…" : music ? "Ще раз" : "Створити"}
        </SmallButton>
      </div>
      {isMusicTooShort ? (
        <p className="mt-2 text-xs text-amber-800">
          Музика коротша за рілс ({music?.durationSeconds} с) — створи її ще раз.
        </p>
      ) : null}
      <AudioPreview outputPath={music?.outputPath} version={music?.generatedAt} />
      <ErrorText message={request.error} />
    </Panel>
  );
}

function FinalRenderPanel({
  reel,
  scenes,
}: {
  reel: ReelDraft;
  scenes: ReelScene[];
}) {
  const [outputPath, setOutputPath] = useState(reel.finalOutputPath);
  const [version, setVersion] = useState(reel.finalRenderedAt);
  const request = usePostRequest<{ finalOutputPath: string }>();
  const readyCount = scenes.filter(hasVideo).length;
  const canRender = scenes.length > 0 && readyCount === scenes.length;

  async function handleRender() {
    const payload = await request.send(`/api/reels/${reel.id}/render`);

    if (payload) {
      setOutputPath(payload.finalOutputPath);
      setVersion(String(Date.now()));
    }
  }

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Фінальний рілс</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Готові сцени: {readyCount}/{scenes.length} · 1080×1920, спільний
            колір і зерно
          </p>
        </div>
        <SmallButton
          disabled={request.isPending || !canRender}
          onClick={handleRender}
          variant="primary"
        >
          {request.isPending ? "Рендер…" : "Зібрати MP4"}
        </SmallButton>
      </div>
      {outputPath ? (
        <div className="mx-auto mt-4 max-w-72">
          <VideoPreview outputPath={outputPath} version={version} />
        </div>
      ) : null}
      <ErrorText message={request.error || reel.finalRenderError} />
    </Panel>
  );
}

function CostPanel({
  generations,
  scenes,
}: {
  generations: GenerationMetadata[];
  scenes: ReelScene[];
}) {
  const videoCost = calculateGenerationCostSummary(generations);
  const keyframeCost = scenes.reduce(
    (total, scene) => total + (scene.keyframe?.estimatedCostUsd ?? 0),
    0,
  );

  return (
    <Panel>
      <h2 className="text-lg font-semibold">Орієнтовна вартість</h2>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <dt className="text-[var(--muted)]">Відео (усі спроби)</dt>
        <dd className="text-right font-semibold">
          {formatUsd(videoCost.estimatedTotalUsd)}
          {videoCost.unknownGenerationCount > 0 ? " +?" : ""}
        </dd>
        <dt className="text-[var(--muted)]">Поточні кадри</dt>
        <dd className="text-right font-semibold">{formatUsd(keyframeCost)}</dd>
      </dl>
    </Panel>
  );
}
