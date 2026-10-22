"use client";

import { useCallback, useState } from "react";
import { ReelFinishPanel } from "@/components/ReelFinishPanel";
import { hasSoundEffects } from "@/components/SceneAudioPanel";
import { SceneCard, type SceneTask } from "@/components/SceneCard";
import { Panel, SmallButton } from "@/components/ui";
import { postJson, readErrorMessage } from "@/components/usePostRequest";
import {
  hasVideo,
  getKeyframeOutdatedReason,
  isVideoInProgress,
  isVideoOutdated,
} from "@/lib/scene-status";
import type { SceneWarning } from "@/lib/scenes";
import type { GenerationMetadata } from "@/lib/types/generation";
import type {
  ReelDraft,
  ReelScene,
  SceneAudioOutput,
  SceneKeyframe,
  SceneVoiceoverOutput,
} from "@/lib/types/reel";

type SceneEditorProps = {
  reel: ReelDraft;
  /** Names of reusable clips in references/clips. */
  clipNames: string[];
  scenes: ReelScene[];
  generations: GenerationMetadata[];
  warnings: SceneWarning[];
};

export type BatchTask = "keyframes" | "videos" | "voiceovers" | "soundEffects";

/**
 * Storyboard of the reel. Flow for every scene:
 * 1. keyframe (image with character + previous scene as references)
 * 2. video that starts from that keyframe
 * Then music and the final render at the bottom.
 */
export function SceneEditor({
  reel,
  clipNames,
  scenes: initialScenes,
  generations: initialGenerations,
  warnings,
}: SceneEditorProps) {
  const [scenes, setScenes] = useState(initialScenes);
  const [generations, setGenerations] = useState(initialGenerations);
  const [runningTasks, setRunningTasks] = useState<Record<string, SceneTask>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [batchTask, setBatchTask] = useState<BatchTask | null>(null);
  const scenesUrl = `/api/reels/${reel.id}/scenes`;

  const updateScene = useCallback(
    (sceneId: string, update: (scene: ReelScene) => Partial<ReelScene>) => {
      setScenes((current) =>
        current.map((scene) =>
          scene.id === sceneId ? { ...scene, ...update(scene) } : scene,
        ),
      );
    },
    [],
  );

  const applyGeneration = useCallback(
    (generation: GenerationMetadata) => {
      setGenerations((current) => upsertGeneration(current, generation));
      updateScene(generation.sceneId, (scene) => ({
        status: generation.status,
        outputPath: generation.outputPath ?? scene.outputPath,
      }));
    },
    [updateScene],
  );

  /** Runs one scene action and keeps its loading and error state. */
  async function runSceneTask(
    sceneId: string,
    task: SceneTask,
    work: () => Promise<void>,
  ) {
    setRunningTasks((current) => ({ ...current, [sceneId]: task }));
    setErrors((current) => ({ ...current, [sceneId]: "" }));

    try {
      await work();
      return true;
    } catch (error) {
      setErrors((current) => ({ ...current, [sceneId]: readErrorMessage(error) }));
      return false;
    } finally {
      setRunningTasks((current) => {
        const next = { ...current };
        delete next[sceneId];
        return next;
      });
    }
  }

  function generateKeyframe(sceneId: string) {
    return runSceneTask(sceneId, "keyframe", async () => {
      const { keyframe } = await postJson<{ keyframe: SceneKeyframe }>(
        `${scenesUrl}/${sceneId}/keyframe/generate`,
      );

      updateScene(sceneId, () => ({ keyframe }));
    });
  }

  /** Keeps an outdated keyframe instead of generating a new one. */
  function acceptKeyframe(sceneId: string) {
    return runSceneTask(sceneId, "keyframe", async () => {
      const { keyframe } = await postJson<{ keyframe: SceneKeyframe }>(
        `${scenesUrl}/${sceneId}/keyframe/accept`,
      );

      updateScene(sceneId, () => ({ keyframe }));
    });
  }

  function generateVideo(scene: ReelScene) {
    return runSceneTask(scene.id, "video", async () => {
      const { generation } = await postJson<{ generation: GenerationMetadata }>(
        `${scenesUrl}/${scene.id}/generate`,
      );

      applyGeneration(generation);
      updateScene(scene.id, () => ({
        videoKeyframeVersion: scene.keyframe?.generatedAt,
      }));
    });
  }

  /**
   * Keyframes go one by one: each keyframe uses the previous one as a
   * reference, so after one changes, all the following ones are refreshed.
   */
  async function generateMissingKeyframes() {
    setBatchTask("keyframes");
    let previousWasRegenerated = false;

    for (const [index, scene] of scenes.entries()) {
      if (scene.clipName) {
        continue;
      }

      const needsKeyframe =
        !scene.keyframe ||
        previousWasRegenerated ||
        getKeyframeOutdatedReason(scene, scenes[index - 1], reel) !== null;

      if (!needsKeyframe) {
        continue;
      }

      const isDone = await generateKeyframe(scene.id);

      if (!isDone) {
        break;
      }

      previousWasRegenerated = true;
    }

    setBatchTask(null);
  }

  /** Videos run in parallel on fal.ai, so we only start them here. */
  async function generateMissingVideos() {
    setBatchTask("videos");

    for (const scene of scenes) {
      const needsVideo =
        !scene.clipName &&
        scene.keyframe &&
        !isVideoInProgress(scene) &&
        (!hasVideo(scene) || isVideoOutdated(scene));

      if (needsVideo) {
        await generateVideo(scene);
      }
    }

    setBatchTask(null);
  }

  /** Voices every line one by one with the reel narrator settings. */
  async function generateAllVoiceovers() {
    setBatchTask("voiceovers");

    for (const scene of scenes.filter((item) => item.audioPlan.voicePrompt)) {
      const isDone = await runSceneTask(scene.id, "audio", async () => {
        const { voiceoverOutput } = await postJson<{
          voiceoverOutput: SceneVoiceoverOutput;
        }>(`${scenesUrl}/${scene.id}/voiceover/generate`);

        updateScene(scene.id, () => ({ voiceoverOutput }));
      });

      if (!isDone) {
        break;
      }
    }

    setBatchTask(null);
  }

  /** Creates sound effects for scenes that do not have them yet. */
  async function generateMissingSoundEffects() {
    setBatchTask("soundEffects");

    for (const scene of scenes.filter((item) => hasSoundEffects(item) && !item.audioOutput)) {
      await runSceneTask(scene.id, "audio", async () => {
        const { audioOutput } = await postJson<{ audioOutput: SceneAudioOutput }>(
          `${scenesUrl}/${scene.id}/audio/generate`,
        );

        updateScene(scene.id, () => ({ audioOutput }));
      });
    }

    setBatchTask(null);
  }

  const keyframeCount = scenes.filter((scene) => scene.keyframe || scene.clipName).length;
  const videoCount = scenes.filter(hasVideo).length;

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Розкадровка</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
              Спершу кадри: кожен наступний бере попередній як референс, тож
              локація, світло й одяг не змінюються. Коли кадри подобаються —
              запускай відео, воно стартує з кадру.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SmallButton
              disabled={batchTask !== null}
              onClick={generateMissingKeyframes}
            >
              {batchTask === "keyframes"
                ? "Створюємо кадри…"
                : `Створити кадри · ${keyframeCount}/${scenes.length}`}
            </SmallButton>
            <SmallButton
              disabled={batchTask !== null || keyframeCount === 0}
              onClick={generateMissingVideos}
              variant="primary"
            >
              {batchTask === "videos"
                ? "Запускаємо відео…"
                : `Запустити відео · ${videoCount}/${scenes.length}`}
            </SmallButton>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {scenes.map((scene, index) => (
          <SceneCard
            error={errors[scene.id]}
            generation={findLatestGeneration(generations, scene.id)}
            isBatchRunning={batchTask !== null}
            key={scene.id}
            onAcceptKeyframe={() => acceptKeyframe(scene.id)}
            onGenerateKeyframe={() => generateKeyframe(scene.id)}
            onGenerateVideo={() => generateVideo(scene)}
            onGenerationUpdate={applyGeneration}
            onSceneChange={(patch) => updateScene(scene.id, () => patch)}
            clipNames={clipNames}
            previousScene={scenes[index - 1]}
            reel={reel}
            runningTask={runningTasks[scene.id]}
            scene={scene}
            warning={warnings.find((item) => item.sceneId === scene.id)}
          />
        ))}
      </div>

      <ReelFinishPanel
        batchTask={batchTask}
        generations={generations}
        onGenerateSoundEffects={generateMissingSoundEffects}
        onGenerateVoiceovers={generateAllVoiceovers}
        reel={reel}
        scenes={scenes}
      />
    </div>
  );
}

function findLatestGeneration(
  generations: GenerationMetadata[],
  sceneId: string,
) {
  return generations.find((generation) => generation.sceneId === sceneId);
}

function upsertGeneration(
  generations: GenerationMetadata[],
  generation: GenerationMetadata,
) {
  const others = generations.filter((item) => item.id !== generation.id);

  return [generation, ...others].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}
