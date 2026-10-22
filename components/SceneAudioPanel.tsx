"use client";

import { AudioPreview } from "@/components/AudioPreview";
import { ErrorText, SmallButton } from "@/components/ui";
import { usePostRequest } from "@/components/usePostRequest";
import { VideoPreview } from "@/components/VideoPreview";
import type {
  ReelScene,
  SceneAudioOutput,
  SceneVoiceoverOutput,
} from "@/lib/types/reel";

type SceneAudioPanelProps = {
  reelId: string;
  scene: ReelScene;
  onSceneChange: (patch: Partial<ReelScene>) => void;
};

/** Voiceover, sound effects and the scene preview with sound. */
export function SceneAudioPanel({ reelId, scene, onSceneChange }: SceneAudioPanelProps) {
  const sceneUrl = `/api/reels/${reelId}/scenes/${scene.id}`;

  return (
    <div className="grid gap-4">
      <VoiceoverControls onSceneChange={onSceneChange} scene={scene} sceneUrl={sceneUrl} />
      <SoundEffectControls onSceneChange={onSceneChange} scene={scene} sceneUrl={sceneUrl} />
      <ScenePreviewControls onSceneChange={onSceneChange} scene={scene} sceneUrl={sceneUrl} />
    </div>
  );
}

type ControlsProps = Omit<SceneAudioPanelProps, "reelId"> & { sceneUrl: string };

function VoiceoverControls({ scene, sceneUrl, onSceneChange }: ControlsProps) {
  const request = usePostRequest<{ voiceoverOutput: SceneVoiceoverOutput }>();
  const output = scene.voiceoverOutput;

  async function handleGenerate() {
    const payload = await request.send(`${sceneUrl}/voiceover/generate`);

    if (payload) {
      onSceneChange({ voiceoverOutput: payload.voiceoverOutput });
    }
  }

  if (!scene.audioPlan.voicePrompt) {
    return (
      <AudioRow title="Голос за кадром">
        <p className="text-xs text-[var(--muted)]">
          Додай у блок «Звук:» рядок <code>Voiceover 0.6–3.8: “Текст”</code>.
        </p>
      </AudioRow>
    );
  }

  const overflowSeconds = getVoiceoverOverflowSeconds(scene);

  return (
    <AudioRow
      action={
        <SmallButton disabled={request.isPending} onClick={handleGenerate}>
          {request.isPending ? "Озвучення…" : output ? "Ще раз" : "Озвучити"}
        </SmallButton>
      }
      title="Голос за кадром"
    >
      {output ? (
        <p className="text-xs italic text-[var(--muted)]">
          {output.speakerName}, з {output.startSeconds} с
          {output.durationSeconds ? `, ${output.durationSeconds} с` : ""}: “{output.text}”
        </p>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          Голос, настрій і темп задаються у «Сценарій і вигляд».
        </p>
      )}
      {overflowSeconds > 0 ? (
        <p className="text-xs text-amber-800">
          Репліка довша за сцену на {overflowSeconds} с і заходить у наступну —
          стеж, щоб не накладалась на наступну репліку.
        </p>
      ) : null}
      <AudioPreview outputPath={output?.outputPath} version={output?.generatedAt} />
      <ErrorText message={request.error} />
    </AudioRow>
  );
}

function SoundEffectControls({ scene, sceneUrl, onSceneChange }: ControlsProps) {
  const request = usePostRequest<{ audioOutput: SceneAudioOutput }>();
  const output = scene.audioOutput;
  const cues = scene.audioPlan.sfx;

  async function handleGenerate() {
    const payload = await request.send(`${sceneUrl}/audio/generate`);

    if (payload) {
      onSceneChange({ audioOutput: payload.audioOutput });
    }
  }

  if (!hasSoundEffects(scene)) {
    return (
      <AudioRow title="Звукові ефекти">
        <p className="text-xs text-[var(--muted)]">
          Додай у блок «Звук:» подію, наприклад <code>1.0–2.5: tea pouring</code>.
        </p>
      </AudioRow>
    );
  }

  return (
    <AudioRow
      action={
        <SmallButton disabled={request.isPending} onClick={handleGenerate}>
          {request.isPending ? "Генерація…" : output ? "Ще раз" : "Створити SFX"}
        </SmallButton>
      }
      title="Звукові ефекти"
    >
      <ul className="grid gap-0.5 text-xs text-[var(--muted)]">
        {cues.map((cue, index) => (
          <li key={`${cue.description}-${index}`}>
            {formatCueTime(cue)}
            {cue.description}
          </li>
        ))}
      </ul>
      <AudioPreview outputPath={output?.outputPath} version={output?.generatedAt} />
      <ErrorText message={request.error} />
    </AudioRow>
  );
}

function ScenePreviewControls({ scene, sceneUrl, onSceneChange }: ControlsProps) {
  const request = usePostRequest<{ previewOutputPath: string }>();

  async function handleRender() {
    const payload = await request.send(`${sceneUrl}/preview/render`);

    if (payload) {
      onSceneChange({
        previewOutputPath: payload.previewOutputPath,
        previewRenderedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <AudioRow
      action={
        <SmallButton disabled={request.isPending || !scene.outputPath} onClick={handleRender}>
          {request.isPending ? "Склеювання…" : "Зібрати"}
        </SmallButton>
      }
      title="Сцена зі звуком"
    >
      <p className="text-xs text-[var(--muted)]">
        Відео + SFX + голос цієї сцени, без фонової музики.
      </p>
      {scene.previewOutputPath ? (
        <div className="mt-2 max-w-48">
          <VideoPreview
            outputPath={scene.previewOutputPath}
            version={scene.previewRenderedAt}
          />
        </div>
      ) : null}
      <ErrorText message={request.error} />
    </AudioRow>
  );
}

function AudioRow({
  action,
  children,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="grid gap-2 border-t border-[var(--border)] pt-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export function hasSoundEffects(scene: ReelScene) {
  return scene.audioPlan.source === "explicit" && scene.audioPlan.sfx.length > 0;
}

/** Seconds the voice clip runs past the end of its scene (0 if it fits). */
function getVoiceoverOverflowSeconds(scene: ReelScene) {
  const output = scene.voiceoverOutput;

  if (!output?.durationSeconds) {
    return 0;
  }

  const overflow = output.startSeconds + output.durationSeconds - scene.durationSeconds;

  return overflow > 0.1 ? Math.round(overflow * 10) / 10 : 0;
}

function formatCueTime(cue: ReelScene["audioPlan"]["sfx"][number]) {
  if (typeof cue.startSeconds !== "number" || typeof cue.endSeconds !== "number") {
    return "";
  }

  return `${cue.startSeconds}–${cue.endSeconds} с: `;
}
