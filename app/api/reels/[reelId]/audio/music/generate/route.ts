import { getAudioProvider } from "@/lib/ai/audio-providers";
import { saveReelBackgroundAudio } from "@/lib/files/media";
import { readReelDraft, updateReelBackgroundAudio } from "@/lib/reels";
import { readReelScenes } from "@/lib/scenes";
import type { ReelScene } from "@/lib/types/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIN_MUSIC_DURATION_SECONDS = 3;
const MAX_MUSIC_DURATION_SECONDS = 600;

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string }>;
  },
) {
  const { reelId } = await params;
  const [reel, scenesDocument] = await Promise.all([
    readReelDraft(reelId),
    readReelScenes(reelId),
  ]);

  if (!reel) {
    return jsonError("Reel не знайдено.", 404);
  }

  if (!scenesDocument || scenesDocument.scenes.length === 0) {
    return jsonError("Спершу збережи сцени для цього Reel.", 400);
  }

  const durationSeconds = getReelDurationSeconds(scenesDocument.scenes);

  if (
    durationSeconds < MIN_MUSIC_DURATION_SECONDS ||
    durationSeconds > MAX_MUSIC_DURATION_SECONDS
  ) {
    return jsonError(
      `Фонову музику можна створити для Reel тривалістю від ${MIN_MUSIC_DURATION_SECONDS} до ${MAX_MUSIC_DURATION_SECONDS} секунд.`,
      422,
    );
  }

  try {
    const result = await getAudioProvider().generateMusic({
      durationSeconds,
      prompt: buildReelMusicPrompt({
        scenes: scenesDocument.scenes,
        story: reel.story,
        style: reel.style,
      }),
    });
    const outputPath = await saveReelBackgroundAudio({ reelId, result });
    const backgroundAudio = {
      provider: result.provider,
      model: result.model,
      outputPath,
      durationSeconds: result.durationSeconds,
      characterCost: result.characterCost,
      generatedAt: new Date().toISOString(),
    } satisfies NonNullable<typeof reel.backgroundAudio>;
    const updatedReel = await updateReelBackgroundAudio(reelId, backgroundAudio);

    return Response.json({ backgroundAudio, reel: updatedReel }, { status: 201 });
  } catch (error) {
    return jsonError(readErrorMessage(error), 502);
  }
}

function getReelDurationSeconds(scenes: ReelScene[]) {
  return scenes.reduce((total, scene) => total + scene.durationSeconds, 0);
}

function buildReelMusicPrompt({
  scenes,
  story,
  style,
}: {
  scenes: ReelScene[];
  story: string;
  style?: string;
}) {
  const musicDirections = Array.from(
    new Set(
      scenes
        .map((scene) => scene.audioPlan.musicPrompt?.trim())
        .filter((prompt): prompt is string => Boolean(prompt)),
    ),
  );

  return [
    "Instrumental background music for a short vertical social video.",
    "No vocals, spoken words, dialogue, or recognizable song references.",
    style ? `Visual style: ${compactText(style, 320)}.` : "",
    musicDirections.length > 0
      ? `Music direction: ${compactText(musicDirections.join("; "), 700)}.`
      : "",
    `Story mood: ${compactText(story, 700)}.`,
    "Keep the arrangement supportive and unobtrusive so foreground sound effects remain clear.",
  ]
    .filter(Boolean)
    .join(" ");
}

function compactText(value: string, maximumLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maximumLength);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Music provider error.";
}
