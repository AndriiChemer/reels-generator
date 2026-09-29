import type { AudioProvider } from "@/lib/ai/audio-providers/types";
import type {
  AudioGenerationInput,
  AudioGenerationResult,
  AudioOutputExtension,
  MusicGenerationInput,
} from "@/lib/types/audio-generation";

const ELEVENLABS_API_BASE_URL = "https://api.elevenlabs.io";
const DEFAULT_MODEL = "eleven_text_to_sound_v2";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";
const DEFAULT_PROMPT_INFLUENCE = 0.45;
const DEFAULT_MUSIC_MODEL = "music_v2_5";
const DEFAULT_MUSIC_OUTPUT_FORMAT = "mp3_44100_128";
const MIN_DURATION_SECONDS = 0.5;
const MAX_DURATION_SECONDS = 30;
const MIN_MUSIC_DURATION_SECONDS = 3;
const MAX_MUSIC_DURATION_SECONDS = 600;

export class ElevenLabsAudioProvider implements AudioProvider {
  async generateSoundEffect(
    input: AudioGenerationInput,
  ): Promise<AudioGenerationResult> {
    validateInput(input);

    const model = input.model || readModel();
    const outputFormat = input.outputFormat || readOutputFormat();
    const promptInfluence =
      input.promptInfluence ?? readPromptInfluence() ?? DEFAULT_PROMPT_INFLUENCE;
    const response = await fetch(
      `${ELEVENLABS_API_BASE_URL}/v1/sound-generation?output_format=${encodeURIComponent(
        outputFormat,
      )}`,
      {
        body: JSON.stringify({
          text: input.prompt,
          duration_seconds: input.durationSeconds,
          loop: Boolean(input.loop),
          model_id: model,
          prompt_influence: promptInfluence,
        }),
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": readApiKey(),
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(await readElevenLabsError(response));
    }

    return {
      provider: "elevenlabs",
      model,
      audioBytes: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") || "audio/mpeg",
      extension: inferExtension(outputFormat),
      outputFormat,
      durationSeconds: input.durationSeconds,
      characterCost: readNumericHeader(response, "character-cost"),
      rawResponseHeaders: readResponseHeaders(response),
    };
  }

  async generateMusic(
    input: MusicGenerationInput,
  ): Promise<AudioGenerationResult> {
    validateMusicInput(input);

    const model = input.model || readMusicModel();
    const outputFormat = input.outputFormat || readMusicOutputFormat();
    const response = await fetch(
      `${ELEVENLABS_API_BASE_URL}/v1/music?output_format=${encodeURIComponent(
        outputFormat,
      )}`,
      {
        body: JSON.stringify({
          force_instrumental: true,
          model_id: model,
          music_length_ms: Math.round(input.durationSeconds * 1000),
          prompt: input.prompt,
        }),
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": readApiKey(),
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(await readElevenLabsError(response));
    }

    return {
      provider: "elevenlabs",
      model,
      audioBytes: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") || "audio/mpeg",
      extension: inferExtension(outputFormat),
      outputFormat,
      durationSeconds: input.durationSeconds,
      characterCost: readNumericHeader(response, "character-cost"),
      rawResponseHeaders: readResponseHeaders(response),
    };
  }
}

export function createElevenLabsAudioProvider() {
  return new ElevenLabsAudioProvider();
}

function validateInput(input: AudioGenerationInput) {
  if (!input.prompt.trim()) {
    throw new Error("Audio prompt is empty.");
  }

  if (
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds < MIN_DURATION_SECONDS ||
    input.durationSeconds > MAX_DURATION_SECONDS
  ) {
    throw new Error(
      `Audio duration must be between ${MIN_DURATION_SECONDS} and ${MAX_DURATION_SECONDS} seconds.`,
    );
  }

  if (
    typeof input.promptInfluence === "number" &&
    (input.promptInfluence < 0 || input.promptInfluence > 1)
  ) {
    throw new Error("Audio prompt influence must be between 0 and 1.");
  }
}

function validateMusicInput(input: MusicGenerationInput) {
  if (!input.prompt.trim()) {
    throw new Error("Music prompt is empty.");
  }

  if (
    !Number.isFinite(input.durationSeconds) ||
    input.durationSeconds < MIN_MUSIC_DURATION_SECONDS ||
    input.durationSeconds > MAX_MUSIC_DURATION_SECONDS
  ) {
    throw new Error(
      `Music duration must be between ${MIN_MUSIC_DURATION_SECONDS} and ${MAX_MUSIC_DURATION_SECONDS} seconds.`,
    );
  }
}

function readApiKey() {
  const key = process.env.ELEVENLABS_API_KEY?.trim();

  if (!key) {
    throw new Error("ELEVENLABS_API_KEY is missing. Add it to .env.local.");
  }

  return key;
}

function readModel() {
  return process.env.ELEVENLABS_SOUND_EFFECTS_MODEL?.trim() || DEFAULT_MODEL;
}

function readOutputFormat() {
  return process.env.ELEVENLABS_OUTPUT_FORMAT?.trim() || DEFAULT_OUTPUT_FORMAT;
}

function readMusicModel() {
  return process.env.ELEVENLABS_MUSIC_MODEL?.trim() || DEFAULT_MUSIC_MODEL;
}

function readMusicOutputFormat() {
  return (
    process.env.ELEVENLABS_MUSIC_OUTPUT_FORMAT?.trim() ||
    DEFAULT_MUSIC_OUTPUT_FORMAT
  );
}

function readPromptInfluence() {
  const value = process.env.ELEVENLABS_PROMPT_INFLUENCE?.trim();

  if (!value) {
    return null;
  }

  const promptInfluence = Number.parseFloat(value);

  if (
    !Number.isFinite(promptInfluence) ||
    promptInfluence < 0 ||
    promptInfluence > 1
  ) {
    throw new Error("ELEVENLABS_PROMPT_INFLUENCE must be between 0 and 1.");
  }

  return promptInfluence;
}

function inferExtension(outputFormat: string): AudioOutputExtension {
  const codec = outputFormat.split("_")[0];

  switch (codec) {
    case "mp3":
      return "mp3";
    case "wav":
      return "wav";
    case "pcm":
      return "pcm";
    case "opus":
      return "opus";
    case "ulaw":
      return "ulaw";
    case "alaw":
      return "alaw";
    default:
      return "mp3";
  }
}

function readNumericHeader(response: Response, headerName: string) {
  const value = response.headers.get(headerName);

  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseFloat(value);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function readResponseHeaders(response: Response) {
  return {
    "character-cost": response.headers.get("character-cost") || "",
    "content-type": response.headers.get("content-type") || "",
  };
}

async function readElevenLabsError(response: Response) {
  const fallbackMessage = `ElevenLabs request failed with ${response.status}.`;

  try {
    const payload = (await response.json()) as {
      detail?: string | { message?: string };
      message?: string;
      error?: string | { message?: string };
    };

    if (payload.message) {
      return payload.message;
    }

    if (typeof payload.detail === "string") {
      return payload.detail;
    }

    if (payload.detail?.message) {
      return payload.detail.message;
    }

    if (typeof payload.error === "string") {
      return payload.error;
    }

    if (payload.error?.message) {
      return payload.error.message;
    }

    return fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}
