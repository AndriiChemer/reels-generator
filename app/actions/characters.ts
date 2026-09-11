"use server";

import { revalidatePath } from "next/cache";
import {
  deleteCharacter,
  saveCharacter,
  validateReferenceImages,
} from "@/lib/characters";
import type { CharacterInput } from "@/lib/types/character";

export type CharacterFormState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Partial<Record<keyof CharacterInput, string>>;
};

export async function saveCharacterAction(
  characterId: string | undefined,
  _previousState: CharacterFormState,
  formData: FormData,
): Promise<CharacterFormState> {
  const input = readCharacterInput(formData);
  const errors = validateCharacterInput(input);

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Перевір поля персонажа перед збереженням.",
      errors,
    };
  }

  await saveCharacter(input, characterId);
  revalidatePath("/characters");

  return {
    status: "success",
    message: characterId ? "Персонажа оновлено." : "Персонажа створено.",
  };
}

export async function deleteCharacterAction(formData: FormData) {
  const characterId = readTextField(formData, "characterId");

  if (!characterId) {
    return;
  }

  await deleteCharacter(characterId);
  revalidatePath("/characters");
}

function readCharacterInput(formData: FormData): CharacterInput {
  return {
    name: readTextField(formData, "name"),
    age: readTextField(formData, "age"),
    description: readTextField(formData, "description"),
    appearance: readTextField(formData, "appearance"),
    personality: readTextField(formData, "personality"),
    clothes: readTextField(formData, "clothes"),
    referenceImagesText: readTextField(formData, "referenceImagesText"),
    voiceId: readTextField(formData, "voiceId"),
  };
}

function validateCharacterInput(input: CharacterInput) {
  const errors: Partial<Record<keyof CharacterInput, string>> = {};

  if (!input.name) {
    errors.name = "Вкажи імʼя персонажа.";
  }

  if (!input.description) {
    errors.description = "Додай короткий опис персонажа.";
  }

  if (!input.appearance) {
    errors.appearance = "Опиши зовнішність персонажа.";
  }

  if (!input.personality) {
    errors.personality = "Опиши характер персонажа.";
  }

  if (validateReferenceImages(input.referenceImagesText).length > 0) {
    errors.referenceImagesText =
      "Використовуй тільки локальні відносні шляхи без '..'.";
  }

  return errors;
}

function readTextField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}
