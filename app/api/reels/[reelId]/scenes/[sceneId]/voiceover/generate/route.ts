import { getAudioProvider } from "@/lib/ai/audio-providers";
import { listCharacters } from "@/lib/characters";
import { saveSceneVoiceover } from "@/lib/files/media";
import {
  findReelScene,
  getSceneVoiceoverCue,
  readReelScenes,
  updateReelSceneVoiceover,
} from "@/lib/scenes";
import type { ReelScene } from "@/lib/types/reel";
import type { VoiceoverEmotion } from "@/lib/types/reel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ reelId: string; sceneId: string }>;
  },
) {
  const { reelId, sceneId } = await params;
  const scenesDocument = await readReelScenes(reelId);
  const scene = findReelScene(scenesDocument, sceneId);

  if (!scene) {
    return jsonError("Сцену не знайдено.", 404);
  }

  const cue = getSceneVoiceoverCue(scene);

  if (!cue) {
    return jsonError(
      "У блоці Звук не знайдено рядок Voiceover із текстом для озвучення.",
      422,
    );
  }

  const settings = await readVoiceoverSettings(request);

  try {
    const speaker = await getVoiceoverSpeaker(scene);
    const result = await getAudioProvider().generateSpeech({
      text: cue.text,
      voiceId: speaker.voiceId,
      voiceSettings: {
        ...getVoiceSettings(settings.emotion),
        speed: settings.speechRate,
      },
    });
    const outputPath = await saveSceneVoiceover({ reelId, sceneId, result });
    const voiceoverOutput = {
      provider: result.provider,
      model: result.model,
      outputPath,
      text: cue.text,
      speakerCharacterId: speaker.id,
      speakerName: speaker.name,
      speakerVoiceId: speaker.voiceId,
      startSeconds: cue.startSeconds,
      endSeconds: cue.endSeconds,
      emotion: settings.emotion,
      speechRate: settings.speechRate,
      speedAppliedNatively: true,
      characterCost: result.characterCost,
      generatedAt: new Date().toISOString(),
    } satisfies NonNullable<ReelScene["voiceoverOutput"]>;
    const updatedScene = await updateReelSceneVoiceover(
      reelId,
      sceneId,
      voiceoverOutput,
    );

    return Response.json({ voiceoverOutput, scene: updatedScene }, { status: 201 });
  } catch (error) {
    return jsonError(readErrorMessage(error), 502);
  }
}

type VoiceoverSettings = {
  emotion: VoiceoverEmotion;
  speechRate: number;
};

async function readVoiceoverSettings(request: Request): Promise<VoiceoverSettings> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const value = isRecord(payload) ? payload : {};
  const emotion = isVoiceoverEmotion(value.emotion) ? value.emotion : "neutral";
  const speechRate = normalizeSpeechRate(value.speechRate);

  return { emotion, speechRate };
}

function getVoiceSettings(emotion: VoiceoverEmotion) {
  switch (emotion) {
    case "sad":
      return { similarityBoost: 0.75, stability: 0.6, style: 0 };
    case "warm":
      return { similarityBoost: 0.75, stability: 0.55, style: 0 };
    case "calm":
      return { similarityBoost: 0.75, stability: 0.7, style: 0 };
    case "energetic":
      return { similarityBoost: 0.75, stability: 0.4, style: 0 };
    case "neutral":
    default:
      return { similarityBoost: 0.75, stability: 0.55, style: 0 };
  }
}

function normalizeSpeechRate(value: unknown) {
  const rate = typeof value === "number" ? value : 1;

  if (!Number.isFinite(rate)) {
    return 1;
  }

  return Math.min(Math.max(rate, 0.75), 1.25);
}

function isVoiceoverEmotion(value: unknown): value is VoiceoverEmotion {
  return (
    value === "neutral" ||
    value === "sad" ||
    value === "warm" ||
    value === "calm" ||
    value === "energetic"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function getVoiceoverSpeaker(scene: ReelScene) {
  const speakerId = scene.characterIds[0];

  if (!speakerId) {
    throw new Error(
      "Для озвучення додай @персонажа до сцени та вкажи йому Voice ID у ElevenLabs.",
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
