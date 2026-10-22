import type { ReelDraft, VoiceoverEmotion } from "@/lib/types/reel";

/**
 * Narrator delivery presets for ElevenLabs. Safe to import in the browser.
 *
 * - stability: higher = calmer, more even; lower = more emotional range.
 * - style: adds drama. Keep it near zero for calm reads, otherwise the voice
 *   starts to sound "salesy".
 * - speed: slightly slower than 1 sounds more intimate.
 */
export const VOICE_MOODS: Record<
  VoiceoverEmotion,
  { label: string; stability: number; similarityBoost: number; style: number; speed: number }
> = {
  calm: { label: "Спокійний, тихий", stability: 0.75, similarityBoost: 0.8, style: 0.05, speed: 0.93 },
  warm: { label: "Теплий, довірливий", stability: 0.65, similarityBoost: 0.8, style: 0.15, speed: 0.95 },
  sad: { label: "Сумний, вразливий", stability: 0.7, similarityBoost: 0.8, style: 0.1, speed: 0.9 },
  neutral: { label: "Нейтральний", stability: 0.55, similarityBoost: 0.75, style: 0, speed: 1 },
  energetic: { label: "Енергійний", stability: 0.4, similarityBoost: 0.75, style: 0.35, speed: 1.05 },
};

export const DEFAULT_VOICE_MOOD: VoiceoverEmotion = "calm";

export const VOICE_SPEED_OPTIONS = [0.85, 0.9, 0.95, 1, 1.05, 1.1];

export function isVoiceMood(value: unknown): value is VoiceoverEmotion {
  return typeof value === "string" && value in VOICE_MOODS;
}

/** Voice settings for the whole reel: mood preset plus optional speed. */
export function getReelVoiceSettings(reel: Pick<ReelDraft, "voiceMood" | "voiceSpeed">) {
  const mood = reel.voiceMood ?? DEFAULT_VOICE_MOOD;
  const preset = VOICE_MOODS[mood];

  return {
    mood,
    stability: preset.stability,
    similarityBoost: preset.similarityBoost,
    style: preset.style,
    speed: reel.voiceSpeed ?? preset.speed,
  };
}

/** Stable seed per reel, so every line is read the same way. */
export function getVoiceSeed(reelId: string) {
  let hash = 0;

  for (const character of reelId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}
