"use client";

import { useCallback, useEffect, useState } from "react";
import { useActionState } from "react";
import { saveScenesAction } from "@/app/actions/scenes";
import { AudioPreview } from "@/components/AudioPreview";
import { VideoPreview } from "@/components/VideoPreview";
import type { ScenesFormState } from "@/app/actions/scenes";
import {
  calculateGenerationCostSummary,
  formatUsd,
} from "@/lib/costs";
import type { ReferenceAsset } from "@/lib/references";
import type { SceneWarning } from "@/lib/scenes";
import type { Character } from "@/lib/types/character";
import type { GenerationMetadata } from "@/lib/types/generation";
import type {
  ReelBackgroundAudioOutput,
  ReelScene,
  ReelScenesDocument,
} from "@/lib/types/reel";

type SceneEditorProps = {
  backgroundAudio?: ReelBackgroundAudioOutput;
  characters: Character[];
  finalOutputPath?: string;
  finalRenderError?: string;
  generations: GenerationMetadata[];
  reelId: string;
  referenceAssets: ReferenceAsset[];
  scenesDocument: ReelScenesDocument | null;
  warnings: SceneWarning[];
};

const initialScenesFormState: ScenesFormState = {
  status: "idle",
  message: "",
};

export function SceneEditor({
  backgroundAudio,
  characters,
  finalOutputPath,
  finalRenderError,
  generations,
  reelId,
  referenceAssets,
  scenesDocument,
  warnings,
}: SceneEditorProps) {
  const saveAction = saveScenesAction.bind(null, reelId);
  const [state, formAction, isPending] = useActionState(
    saveAction,
    initialScenesFormState,
  );
  const [generationRecords, setGenerationRecords] = useState(generations);
  const scenes = scenesDocument?.scenes ?? [];

  const handleGenerationChange = useCallback((generation: GenerationMetadata) => {
    setGenerationRecords((currentGenerations) =>
      upsertGenerationRecord(currentGenerations, generation),
    );
  }, []);

  return (
    <section className="grid gap-5">
      <form
        action={formAction}
        className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6"
      >
        <label className="grid gap-2" htmlFor="scenes-source-text">
          <span className="text-xl font-semibold">Сцени</span>
          <textarea
            aria-describedby={
              state.errors?.sourceText ? "scenes-source-text-error" : undefined
            }
            aria-invalid={Boolean(state.errors?.sourceText)}
            className="min-h-80 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base leading-7 outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
            defaultValue={scenesDocument?.sourceText}
            id="scenes-source-text"
            name="sourceText"
            placeholder={
              "Сцена 1:\n@mia відкриває застосунок. На екрані видно #screen-home.\nКадр 4 секунди, вертикальний UGC-стиль.\n\nЗвук:\n- 0.0-4.0: тиха фонова музика\n- 1.0-2.5: звук свайпу і легкий whoosh\n- без голосу\n\nСцена 2:\n@mia показує результат. #logo використати як референс для бренду."
            }
            rows={12}
            required
          />
          <FieldError
            error={state.errors?.sourceText}
            id="scenes-source-text-error"
          />
        </label>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Збереження..." : "Зберегти сцени"}
          </button>

          {state.message ? (
            <p
              aria-live="polite"
              className={
                state.status === "success"
                  ? "text-sm font-medium text-[var(--accent-strong)]"
                  : "text-sm font-medium text-red-700"
              }
            >
              {state.message}
            </p>
          ) : null}
        </div>
      </form>

      <SceneWarnings warnings={warnings} />

      {scenes.length > 0 ? (
        <section className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Розпізнані сцени</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Збережено сцен: {scenes.length}
              </p>
            </div>
            <ReferenceSummary
              characters={characters}
              referenceAssets={referenceAssets}
            />
          </div>

          <FinalReelRenderer
            finalOutputPath={finalOutputPath}
            finalRenderError={finalRenderError}
            reelId={reelId}
            scenes={scenes}
          />

          <BackgroundMusicGenerator
            initialBackgroundAudio={backgroundAudio}
            reelId={reelId}
            scenes={scenes}
          />

          <CostSummary generations={generationRecords} />

          {scenes.map((scene) => (
            <SceneCard
              generation={findLatestGeneration(scene.id, generationRecords)}
              key={scene.id}
              onGenerationChange={handleGenerationChange}
              reelId={reelId}
              scene={scene}
              warnings={warnings}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-5">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Сцени ще не збережені для цього Reel.
          </p>
        </div>
      )}
    </section>
  );
}

function BackgroundMusicGenerator({
  initialBackgroundAudio,
  reelId,
  scenes,
}: {
  initialBackgroundAudio?: ReelBackgroundAudioOutput;
  reelId: string;
  scenes: ReelScene[];
}) {
  const [backgroundAudio, setBackgroundAudio] = useState(initialBackgroundAudio);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const durationSeconds = scenes.reduce(
    (total, scene) => total + scene.durationSeconds,
    0,
  );
  const canGenerate = durationSeconds >= 3 && durationSeconds <= 600;

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/reels/${reelId}/audio/music/generate`, {
        method: "POST",
      });
      const payload = (await response.json()) as MusicGenerationApiResponse;

      if (!response.ok || !payload.backgroundAudio) {
        setErrorMessage(payload.error || "Не вдалося згенерувати фонову музику.");
        return;
      }

      setBackgroundAudio(payload.backgroundAudio);
    } catch (error) {
      setErrorMessage(readClientError(error));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Фонова музика</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Одна інструментальна доріжка для всього Reel. Вона буде тихо
            зміксована з вибірковими SFX під час фінального рендеру.
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Тривалість Reel: {durationSeconds}s. Для генерації потрібен доступ
            Music Generation у ключі ElevenLabs.
          </p>
        </div>
        <button
          className="w-full rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
          disabled={isGenerating || !canGenerate}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating
            ? "Генерація музики..."
            : backgroundAudio
              ? "Згенерувати музику ще раз"
              : "Згенерувати фонову музику"}
        </button>
      </div>

      {!canGenerate ? (
        <p className="mt-3 text-sm leading-6 text-amber-800">
          Музику можна створити для Reel тривалістю від 3 до 600 секунд.
        </p>
      ) : null}

      {backgroundAudio ? (
        <div className="mt-3 grid gap-1 text-xs leading-5 text-[var(--muted)]">
          <p>
            Провайдер: {backgroundAudio.provider}; модель: {backgroundAudio.model};
            тривалість: {backgroundAudio.durationSeconds}s
          </p>
          {typeof backgroundAudio.characterCost === "number" ? (
            <p>Облік ElevenLabs: {backgroundAudio.characterCost}</p>
          ) : null}
          <p className="break-all">Файл: {backgroundAudio.outputPath}</p>
        </div>
      ) : null}

      <AudioPreview outputPath={backgroundAudio?.outputPath} />

      {errorMessage ? (
        <p aria-live="polite" className="mt-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function FinalReelRenderer({
  finalOutputPath,
  finalRenderError,
  reelId,
  scenes,
}: {
  finalOutputPath?: string;
  finalRenderError?: string;
  reelId: string;
  scenes: ReelScene[];
}) {
  const [outputPath, setOutputPath] = useState(finalOutputPath);
  const [errorMessage, setErrorMessage] = useState(finalRenderError || "");
  const [isRendering, setIsRendering] = useState(false);
  const completedScenesCount = scenes.filter(
    (scene) => scene.status === "completed" && scene.outputPath,
  ).length;
  const canRender =
    scenes.length > 0 && completedScenesCount === scenes.length;

  async function handleRender() {
    if (!canRender) {
      setErrorMessage("Спершу згенеруй локальний MP4 для кожної сцени.");
      return;
    }

    setIsRendering(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/reels/${reelId}/render`, {
        method: "POST",
      });
      const payload = (await response.json()) as RenderApiResponse;

      if (!response.ok || !payload.finalOutputPath) {
        setErrorMessage(payload.error || "Не вдалося створити фінальний MP4.");
        return;
      }

      setOutputPath(payload.finalOutputPath);
    } catch (error) {
      setErrorMessage(readClientError(error));
    } finally {
      setIsRendering(false);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Фінальний MP4</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            FFmpeg склеїть готові сцени, зміксує доступні SFX і фонову музику
            у вертикальний 1080x1920 MP4.
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Готові сцени: {completedScenesCount} / {scenes.length}
          </p>
        </div>
        <button
          className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
          disabled={isRendering || !canRender}
          onClick={handleRender}
          type="button"
        >
          {isRendering ? "Рендер..." : "Зібрати фінальний MP4"}
        </button>
      </div>

      <VideoPreview outputPath={outputPath} />

      {outputPath ? (
        <p className="mt-3 break-all text-xs leading-5 text-[var(--muted)]">
          Файл: {outputPath}
        </p>
      ) : null}

      {!canRender ? (
        <p className="mt-3 text-sm leading-6 text-amber-800">
          Для фінального відео потрібні локальні MP4 для всіх сцен.
        </p>
      ) : null}

      {errorMessage ? (
        <p aria-live="polite" className="mt-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function SceneCard({
  generation,
  onGenerationChange,
  reelId,
  scene,
  warnings,
}: {
  generation?: GenerationMetadata;
  onGenerationChange: (generation: GenerationMetadata) => void;
  reelId: string;
  scene: ReelScene;
  warnings: SceneWarning[];
}) {
  const warning = warnings.find((item) => item.sceneId === scene.id);

  return (
    <article className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--accent-strong)]">
            Сцена {scene.order}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{scene.id}</h3>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-md border border-[var(--border)] px-2 py-1">
            {scene.durationSeconds}s
          </span>
          <span className="rounded-md border border-[var(--border)] px-2 py-1">
            {formatStatus(scene.status)}
          </span>
        </div>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[var(--muted)]">
        {scene.rawText}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MentionList
          emptyText="Персонажі не згадані."
          items={scene.characterNames}
          label="@персонажі"
          unknownItems={warning?.unknownCharacterNames ?? []}
        />
        <MentionList
          emptyText="Референси не згадані."
          items={scene.referenceNames}
          label="#референси"
          unknownItems={warning?.unknownReferenceNames ?? []}
        />
      </div>

      <AudioPlanSummary audioPlan={scene.audioPlan} />

      <GenerateSceneSoundEffectButton
        audioPlan={scene.audioPlan}
        initialAudioOutput={scene.audioOutput}
        reelId={reelId}
        sceneId={scene.id}
      />

      <GenerateSceneButton
        initialGeneration={generation}
        onGenerationChange={onGenerationChange}
        reelId={reelId}
        sceneId={scene.id}
        sceneStatus={scene.status}
      />
    </article>
  );
}

function GenerateSceneSoundEffectButton({
  audioPlan,
  initialAudioOutput,
  reelId,
  sceneId,
}: {
  audioPlan: ReelScene["audioPlan"];
  initialAudioOutput?: ReelScene["audioOutput"];
  reelId: string;
  sceneId: string;
}) {
  const [audioOutput, setAudioOutput] = useState(initialAudioOutput);
  const [errorMessage, setErrorMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const canGenerate =
    audioPlan.source === "explicit" && audioPlan.sfx.length > 0;

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/reels/${reelId}/scenes/${sceneId}/audio/generate`,
        { method: "POST" },
      );
      const payload = (await response.json()) as AudioGenerationApiResponse;

      if (!response.ok || !payload.audioOutput) {
        setErrorMessage(payload.error || "Не вдалося згенерувати SFX.");
        return;
      }

      setAudioOutput(payload.audioOutput);
    } catch (error) {
      setErrorMessage(readClientError(error));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold">Вибіркові SFX</h4>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Створюються лише для ручних звукових подій. Музика всього Reel буде
            додана окремим етапом.
          </p>
        </div>
        <button
          className="w-full rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-fit"
          disabled={isGenerating || !canGenerate}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating
            ? "Генерація SFX..."
            : audioOutput
              ? "Згенерувати SFX ще раз"
              : "Згенерувати SFX"}
        </button>
      </div>

      {!canGenerate ? (
        <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
          Додай блок <span className="font-semibold">Звук:</span> з конкретним
          SFX, наприклад: <span className="font-semibold">1.0-2.5: звук
          наливання чаю</span>.
        </p>
      ) : null}

      {audioOutput ? (
        <div className="mt-3 grid gap-1 text-xs leading-5 text-[var(--muted)]">
          <p>
            Провайдер: {audioOutput.provider}; модель: {audioOutput.model};
            тривалість: {audioOutput.durationSeconds}s
          </p>
          {typeof audioOutput.characterCost === "number" ? (
            <p>Облік ElevenLabs: {audioOutput.characterCost}</p>
          ) : null}
          <p className="break-all">Файл: {audioOutput.outputPath}</p>
        </div>
      ) : null}

      <AudioPreview outputPath={audioOutput?.outputPath} />

      {errorMessage ? (
        <p aria-live="polite" className="mt-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

function AudioPlanSummary({
  audioPlan,
}: {
  audioPlan?: ReelScene["audioPlan"];
}) {
  if (!audioPlan) {
    return (
      <section className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
        <h4 className="text-sm font-semibold text-amber-900">Audio plan</h4>
        <p className="mt-2 text-sm leading-6 text-amber-900">
          Для цієї сцени ще немає audio plan. Перезбережи сцени, щоб створити
          його автоматично.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-4 rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold">Audio plan</h4>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {audioPlan.source === "explicit"
              ? "Ручний блок Звук:"
              : "Автоматично з опису сцени"}
            {" · "}
            {formatSpeechPolicy(audioPlan.speechPolicy)}
          </p>
        </div>
        <span className="w-fit rounded-md border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">
          {audioPlan.durationSeconds}s
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        {audioPlan.prompt}
      </p>

      <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--muted)]">
        {audioPlan.ambiencePrompt ? (
          <p>
            <span className="font-semibold text-[var(--foreground)]">
              Атмосфера:
            </span>{" "}
            {audioPlan.ambiencePrompt}
          </p>
        ) : null}
        {audioPlan.musicPrompt ? (
          <p>
            <span className="font-semibold text-[var(--foreground)]">
              Музика:
            </span>{" "}
            {audioPlan.musicPrompt}
          </p>
        ) : null}
        {audioPlan.voicePrompt ? (
          <p>
            <span className="font-semibold text-[var(--foreground)]">
              Голос:
            </span>{" "}
            {audioPlan.voicePrompt}
          </p>
        ) : null}
      </div>

      {audioPlan.sfx.length > 0 ? (
        <ul className="mt-3 grid gap-1 text-xs leading-5 text-[var(--muted)]">
          {audioPlan.sfx.map((cue, index) => (
            <li key={`${cue.description}-${index}`}>
              <span className="font-semibold text-[var(--foreground)]">
                SFX:
              </span>{" "}
              {formatCueTime(cue)}
              {cue.description}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function CostSummary({
  generations,
}: {
  generations: GenerationMetadata[];
}) {
  const summary = calculateGenerationCostSummary(generations);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Орієнтовна вартість</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Локальна оцінка за metadata генерацій. Це не білінг і не платіжна
            логіка.
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-2xl font-semibold">
            {formatUsd(summary.estimatedTotalUsd)}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Відомі оцінки: {summary.knownGenerationCount} /{" "}
            {summary.totalGenerationCount}
          </p>
        </div>
      </div>

      {summary.unknownGenerationCount > 0 ? (
        <p className="mt-3 text-sm leading-6 text-amber-800">
          Для {summary.unknownGenerationCount} генерацій вартість невідома.
        </p>
      ) : null}
    </section>
  );
}

function GenerateSceneButton({
  initialGeneration,
  onGenerationChange,
  reelId,
  sceneId,
  sceneStatus,
}: {
  initialGeneration?: GenerationMetadata;
  onGenerationChange: (generation: GenerationMetadata) => void;
  reelId: string;
  sceneId: string;
  sceneStatus: ReelScene["status"];
}) {
  const [generation, setGeneration] = useState(initialGeneration);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const status = generation?.status ?? sceneStatus;
  const canPoll =
    Boolean(generation?.id) &&
    (generation?.status === "queued" || generation?.status === "processing");

  useEffect(() => {
    if (!canPoll || !generation?.id) {
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/generations/${generation.id}`);
        const payload = (await response.json()) as GenerationApiResponse;

        if (!response.ok || !payload.generation) {
          setErrorMessage(payload.error || "Не вдалося оновити статус.");
          return;
        }

        setGeneration(payload.generation);
        onGenerationChange(payload.generation);
        setErrorMessage(payload.generation.errorMessage || "");
      } catch (error) {
        setErrorMessage(readClientError(error));
      }
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [canPoll, generation?.id, generation?.status, onGenerationChange]);

  async function handleGenerate() {
    setIsGenerating(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/reels/${reelId}/scenes/${sceneId}/generate`,
        {
          method: "POST",
        },
      );
      const payload = (await response.json()) as GenerationApiResponse;

      if (!response.ok || !payload.generation) {
        setErrorMessage(payload.error || "Не вдалося запустити генерацію.");
        return;
      }

      setGeneration(payload.generation);
      onGenerationChange(payload.generation);
      setErrorMessage(payload.generation.errorMessage || "");
    } catch (error) {
      setErrorMessage(readClientError(error));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="w-full rounded-md bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
          disabled={isGenerating || status === "queued" || status === "processing"}
          onClick={handleGenerate}
          type="button"
        >
          {isGenerating ? "Запуск..." : "Згенерувати відео"}
        </button>

        <div className="text-sm text-[var(--muted)]">
          <span className="font-medium text-[var(--foreground)]">Статус:</span>{" "}
          {formatStatus(status)}
        </div>
      </div>

      {generation?.id ? (
        <p className="mt-3 break-all text-xs leading-5 text-[var(--muted)]">
          ID генерації: {generation.id}
        </p>
      ) : null}

      <GenerationCost generation={generation} />

      {generation?.temporaryVideoUrl && !generation.outputPath ? (
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
          URL відео від провайдера отримано. Очікуємо локальний MP4.
        </p>
      ) : null}

      <VideoPreview outputPath={generation?.outputPath} />

      {errorMessage ? (
        <p aria-live="polite" className="mt-3 text-sm font-medium text-red-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function GenerationCost({
  generation,
}: {
  generation?: GenerationMetadata;
}) {
  if (!generation) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-1 text-xs leading-5 text-[var(--muted)]">
      <p>
        Орієнтовна вартість:{" "}
        {typeof generation.estimatedCostUsd === "number"
          ? formatUsd(generation.estimatedCostUsd)
          : "невідомо"}
      </p>
      <p>
        Провайдер: {generation.provider}; модель: {generation.model}; тривалість:{" "}
        {generation.durationSeconds}s
      </p>
    </div>
  );
}

function MentionList({
  emptyText,
  items,
  label,
  unknownItems,
}: {
  emptyText: string;
  items: string[];
  label: string;
  unknownItems: string[];
}) {
  const unknownValues = new Set(
    unknownItems.map((item) => item.trim().toLowerCase()),
  );

  return (
    <div>
      <h4 className="text-sm font-semibold">{label}</h4>
      {items.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map((item) => {
            const isUnknown = unknownValues.has(item.trim().toLowerCase());

            return (
              <span
                className={
                  isUnknown
                    ? "rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                    : "rounded-md border border-teal-200 bg-teal-50 px-2 py-1 text-xs font-medium text-teal-800"
                }
                key={item}
              >
                {item}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">{emptyText}</p>
      )}
    </div>
  );
}

function SceneWarnings({ warnings }: { warnings: SceneWarning[] }) {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-900">
      <h2 className="text-base font-semibold">Попередження</h2>
      <ul className="mt-3 grid gap-2 text-sm leading-6">
        {warnings.map((warning) => (
          <li key={warning.sceneId}>
            Сцена {warning.sceneOrder}:{" "}
            {formatWarningPart("@", warning.unknownCharacterNames)}
            {warning.unknownCharacterNames.length > 0 &&
            warning.unknownReferenceNames.length > 0
              ? "; "
              : ""}
            {formatWarningPart("#", warning.unknownReferenceNames)}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReferenceSummary({
  characters,
  referenceAssets,
}: {
  characters: Character[];
  referenceAssets: ReferenceAsset[];
}) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold text-[var(--muted)]">
      <span className="rounded-md border border-[var(--border)] bg-white px-2 py-1">
        Персонажі: {characters.length}
      </span>
      <span className="rounded-md border border-[var(--border)] bg-white px-2 py-1">
        Референси: {referenceAssets.length}
      </span>
    </div>
  );
}

function formatWarningPart(prefix: string, values: string[]) {
  if (values.length === 0) {
    return "";
  }

  return `${prefix}${values.join(`, ${prefix}`)} не знайдено`;
}

type GenerationApiResponse = {
  generation?: GenerationMetadata;
  error?: string;
};

type AudioGenerationApiResponse = {
  audioOutput?: NonNullable<ReelScene["audioOutput"]>;
  error?: string;
};

type MusicGenerationApiResponse = {
  backgroundAudio?: ReelBackgroundAudioOutput;
  error?: string;
};

type RenderApiResponse = {
  finalOutputPath?: string;
  error?: string;
};

function findLatestGeneration(
  sceneId: string,
  generations: GenerationMetadata[],
) {
  return generations.find((generation) => generation.sceneId === sceneId);
}

function upsertGenerationRecord(
  generations: GenerationMetadata[],
  generation: GenerationMetadata,
) {
  const nextGenerations = generations.some((item) => item.id === generation.id)
    ? generations.map((item) => (item.id === generation.id ? generation : item))
    : [generation, ...generations];

  return nextGenerations.sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function formatStatus(status: ReelScene["status"]) {
  switch (status) {
    case "queued":
      return "у черзі";
    case "processing":
      return "генерується";
    case "completed":
      return "завершено";
    case "failed":
      return "помилка";
    case "draft":
    default:
      return "чернетка";
  }
}

function formatSpeechPolicy(policy: ReelScene["audioPlan"]["speechPolicy"]) {
  switch (policy) {
    case "dialogue_expected":
      return "голос/діалог окремим шаром";
    case "no_speech":
    default:
      return "без голосу";
  }
}

function formatCueTime(cue: ReelScene["audioPlan"]["sfx"][number]) {
  if (
    typeof cue.startSeconds !== "number" ||
    typeof cue.endSeconds !== "number"
  ) {
    return "";
  }

  return `${cue.startSeconds}-${cue.endSeconds}s: `;
}

function readClientError(error: unknown) {
  return error instanceof Error ? error.message : "Невідома помилка.";
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) {
    return null;
  }

  return (
    <span className="text-sm text-red-700" id={id}>
      {error}
    </span>
  );
}
