import { getAudioProvider } from "@/lib/ai/audio-providers";
import { saveSceneAudio } from "@/lib/files/media";
import {
  findReelScene,
  readReelScenes,
  updateReelSceneAudio,
} from "@/lib/scenes";
import type { ReelScene } from "@/lib/types/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const scenesDocument = await readReelScenes(reelId);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!scenesDocument || !scene) {
    return jsonError("Сцену не знайдено. Спершу збережи блок сцен.", 404);
  }

  if (!canGenerateSceneSoundEffect(scene)) {
    return jsonError(
      "Додай у сцену ручний блок Звук: з конкретним SFX, щоб згенерувати аудіо.",
      422,
    );
  }

  try {
    const result = await getAudioProvider().generateSoundEffect({
      durationSeconds: scene.durationSeconds,
      prompt: buildSceneSoundEffectPrompt(scene),
    });
    const outputPath = await saveSceneAudio({ reelId, sceneId, result });
    const audioOutput = {
      provider: result.provider,
      model: result.model,
      outputPath,
      durationSeconds: result.durationSeconds,
      characterCost: result.characterCost,
      generatedAt: new Date().toISOString(),
    } satisfies NonNullable<ReelScene["audioOutput"]>;
    const updatedScene = await updateReelSceneAudio(
      reelId,
      sceneId,
      audioOutput,
    );

    return Response.json({ audioOutput, scene: updatedScene }, { status: 201 });
  } catch (error) {
    return jsonError(readErrorMessage(error), 502);
  }
}

function canGenerateSceneSoundEffect(scene: ReelScene) {
  return scene.audioPlan.source === "explicit" && scene.audioPlan.sfx.length > 0;
}

function buildSceneSoundEffectPrompt(scene: ReelScene) {
  const cues = scene.audioPlan.sfx
    .map((cue) => {
      const timing = formatCueTiming(cue);

      return timing ? `${timing}: ${cue.description}` : cue.description;
    })
    .join("; ");

  return [
    `Створи доріжку SFX тривалістю рівно ${scene.durationSeconds} секунд для короткого вертикального відео.`,
    `Події: ${cues}.`,
    scene.audioPlan.ambiencePrompt
      ? `Атмосфера: ${scene.audioPlan.ambiencePrompt}.`
      : "",
    "Синхронізуй події з указаними моментами, якщо вони є.",
    "Лише звукові ефекти та натуральна атмосфера. Без голосу, діалогу, вокалу й фонової музики.",
  ]
    .filter(Boolean)
    .join(" ");
}

function formatCueTiming(cue: ReelScene["audioPlan"]["sfx"][number]) {
  if (typeof cue.startSeconds !== "number") {
    return "";
  }

  if (typeof cue.endSeconds !== "number") {
    return `${cue.startSeconds}s`;
  }

  return `${cue.startSeconds}-${cue.endSeconds}s`;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Audio provider error.";
}
