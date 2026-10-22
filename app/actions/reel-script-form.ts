import type { ReelArtStyle, ReelScriptInput } from "@/lib/types/reel";
import { isVoiceMood } from "@/lib/voice";

const ART_STYLES: ReelArtStyle[] = ["reference", "animated3d", "photoreal"];

/** Shared by "create reel" and "save script" actions. */
export type ReelScriptFormState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Partial<Record<keyof ReelScriptInput, string>>;
};

export function readReelScriptInput(formData: FormData): ReelScriptInput {
  return {
    title: readTextField(formData, "title"),
    story: readTextField(formData, "story"),
    artStyle: readArtStyle(formData),
    style: readTextField(formData, "style"),
    setting: readTextField(formData, "setting"),
    wardrobe: readTextField(formData, "wardrobe"),
    narratorCharacterId: readTextField(formData, "narratorCharacterId"),
    voiceMood: readVoiceMood(formData),
    voiceSpeed: readVoiceSpeed(formData),
    sourceText: readTextField(formData, "sourceText"),
  };
}

export function validateReelScriptInput(input: ReelScriptInput) {
  const errors: ReelScriptFormState["errors"] = {};

  if (!input.title) {
    errors.title = "Вкажи коротку назву.";
  }

  if (!input.sourceText) {
    errors.sourceText = "Додай хоча б одну сцену.";
  }

  return errors;
}

function readArtStyle(formData: FormData): ReelArtStyle {
  const value = readTextField(formData, "artStyle") as ReelArtStyle;

  return ART_STYLES.includes(value) ? value : "reference";
}

function readVoiceMood(formData: FormData) {
  const value = readTextField(formData, "voiceMood");

  return isVoiceMood(value) ? value : undefined;
}

/** Empty means "use the mood default". */
function readVoiceSpeed(formData: FormData) {
  const value = Number.parseFloat(readTextField(formData, "voiceSpeed"));

  return Number.isFinite(value) ? Math.min(Math.max(value, 0.7), 1.2) : undefined;
}

function readTextField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}
