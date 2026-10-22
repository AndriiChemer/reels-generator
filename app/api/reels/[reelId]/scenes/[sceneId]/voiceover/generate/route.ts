import { getAudioProvider } from "@/lib/ai/audio-providers";
import { listCharacters } from "@/lib/characters";
import { probeDurationSeconds } from "@/lib/ffmpeg/probeDuration";
import { resolveOutputMediaPath, saveSceneVoiceover } from "@/lib/files/media";
import { readReelDraft } from "@/lib/reels";
import {
  findNextScene,
  findPreviousScene,
  findReelScene,
  getSceneVoiceoverCue,
  readReelScenes,
  updateReelSceneVoiceover,
} from "@/lib/scenes";
import type { ReelScene, SceneVoiceoverOutput } from "@/lib/types/reel";
import { getReelVoiceSettings, getVoiceSeed } from "@/lib/voice";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Voices the "Voiceover" line of one scene. Every line of a reel uses the same
 * narrator, mood, speed and seed, and gets the neighbouring lines as context,
 * so separate clips sound like one continuous read.
 */
export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const [reel, scenesDocument] = await Promise.all([
    readReelDraft(reelId),
    readReelScenes(reelId),
  ]);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!reel || !scene) {
    return jsonError("Сцену не знайдено.", 404);
  }

  const cue = getSceneVoiceoverCue(scene);

  if (!cue) {
    return jsonError(
      "У блоці «Звук» немає рядка Voiceover із текстом для озвучення.",
      422,
    );
  }

  try {
    const speaker = await getVoiceoverSpeaker(scene, reel.narratorCharacterId);
    const voice = getReelVoiceSettings(reel);
    const result = await getAudioProvider().generateSpeech({
      text: cue.text,
      voiceId: speaker.voiceId,
      voiceSettings: voice,
      previousText: readVoiceoverText(findPreviousScene(scenesDocument, scene)),
      nextText: readVoiceoverText(findNextScene(scenesDocument, scene)),
      seed: getVoiceSeed(reelId),
    });
    const outputPath = await saveSceneVoiceover({ reelId, sceneId, result });
    const voiceoverOutput: SceneVoiceoverOutput = {
      provider: result.provider,
      model: result.model,
      outputPath,
      text: cue.text,
      speakerCharacterId: speaker.id,
      speakerName: speaker.name,
      speakerVoiceId: speaker.voiceId,
      startSeconds: cue.startSeconds,
      endSeconds: cue.endSeconds,
      emotion: voice.mood,
      speechRate: voice.speed,
      speedAppliedNatively: true,
      durationSeconds: await probeDurationSeconds(resolveOutputMediaPath(outputPath)),
      characterCost: result.characterCost,
      generatedAt: new Date().toISOString(),
    };

    await updateReelSceneVoiceover(reelId, sceneId, voiceoverOutput);

    return Response.json({ voiceoverOutput }, { status: 201 });
  } catch (error) {
    return jsonError(readErrorMessage(error), 502);
  }
}

function readVoiceoverText(scene: ReelScene | null) {
  return scene ? getSceneVoiceoverCue(scene)?.text : undefined;
}

/** The reel narrator reads every line; without one, the first @character does. */
async function getVoiceoverSpeaker(scene: ReelScene, narratorCharacterId?: string) {
  const speakerId = narratorCharacterId || scene.characterIds[0];

  if (!speakerId) {
    throw new Error(
      "Обери «Голос за кадром» у вигляді рілса або додай @персонажа до сцени.",
    );
  }

  const characters = await listCharacters();
  const speaker = characters.find((character) => character.id === speakerId);

  if (!speaker?.voiceId) {
    throw new Error(
      `Для ${speaker?.name || speakerId} вкажи Voice ID у розділі «Персонажі».`,
    );
  }

  return { ...speaker, voiceId: speaker.voiceId };
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Voiceover provider error.";
}
