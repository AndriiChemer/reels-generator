import type {
  AudioGenerationInput,
  AudioGenerationResult,
  MusicGenerationInput,
} from "@/lib/types/audio-generation";

export interface AudioProvider {
  generateSoundEffect(
    input: AudioGenerationInput,
  ): Promise<AudioGenerationResult>;
  generateMusic(input: MusicGenerationInput): Promise<AudioGenerationResult>;
}
