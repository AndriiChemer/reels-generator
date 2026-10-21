import type {
  AudioGenerationInput,
  AudioGenerationResult,
  MusicGenerationInput,
  SpeechGenerationInput,
} from "@/lib/types/audio-generation";

export interface AudioProvider {
  generateSoundEffect(
    input: AudioGenerationInput,
  ): Promise<AudioGenerationResult>;
  generateMusic(input: MusicGenerationInput): Promise<AudioGenerationResult>;
  generateSpeech(input: SpeechGenerationInput): Promise<AudioGenerationResult>;
}
