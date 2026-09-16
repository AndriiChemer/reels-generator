"use server";

import { revalidatePath } from "next/cache";
import { listCharacters } from "@/lib/characters";
import { listReferenceAssets } from "@/lib/references";
import { saveReelScenes } from "@/lib/scenes";
import type { ReelScenesInput } from "@/lib/types/reel";

export type ScenesFormState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Partial<Record<keyof ReelScenesInput, string>>;
};

export async function saveScenesAction(
  reelId: string,
  _previousState: ScenesFormState,
  formData: FormData,
): Promise<ScenesFormState> {
  const input = readScenesInput(formData);
  const errors = validateScenesInput(input);

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Встав хоча б одну сцену перед збереженням.",
      errors,
    };
  }

  const [characters, referenceAssets] = await Promise.all([
    listCharacters(),
    listReferenceAssets(),
  ]);

  await saveReelScenes(reelId, input.sourceText, characters, referenceAssets);
  revalidatePath(`/reels/${reelId}`);

  return {
    status: "success",
    message: "Сцени збережено.",
  };
}

function readScenesInput(formData: FormData): ReelScenesInput {
  return {
    sourceText: readTextField(formData, "sourceText"),
  };
}

function validateScenesInput(input: ReelScenesInput) {
  const errors: Partial<Record<keyof ReelScenesInput, string>> = {};

  if (!input.sourceText) {
    errors.sourceText = "Встав описи сцен.";
  }

  return errors;
}

function readTextField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}
