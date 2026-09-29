import { createElevenLabsAudioProvider } from "@/lib/ai/audio-providers/elevenlabs";
import type { AudioProvider } from "@/lib/ai/audio-providers/types";
import type { AudioProviderName } from "@/lib/types/audio-generation";

export function getAudioProvider(
  providerName: AudioProviderName = readAudioProviderName(),
): AudioProvider {
  if (providerName === "elevenlabs") {
    return createElevenLabsAudioProvider();
  }

  throw new Error(`Unsupported AUDIO_PROVIDER: ${providerName}`);
}

function readAudioProviderName(): AudioProviderName {
  const providerName = process.env.AUDIO_PROVIDER?.trim() || "elevenlabs";

  if (providerName === "elevenlabs") {
    return providerName;
  }

  throw new Error(`Unsupported AUDIO_PROVIDER: ${providerName}`);
}
