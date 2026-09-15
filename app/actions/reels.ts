"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createReelDraft } from "@/lib/reels";
import type { ReelDraftInput } from "@/lib/types/reel";

export type ReelDraftFormState = {
  status: "idle" | "error";
  message: string;
  errors?: Partial<Record<keyof ReelDraftInput, string>>;
};

export async function createReelDraftAction(
  _previousState: ReelDraftFormState,
  formData: FormData,
): Promise<ReelDraftFormState> {
  const input = readReelDraftInput(formData);
  const errors = validateReelDraftInput(input);

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Перевір поля перед створенням Reel.",
      errors,
    };
  }

  const reel = await createReelDraft(input);

  revalidatePath("/reels/new");
  redirect(`/reels/${reel.id}`);
}

function readReelDraftInput(formData: FormData): ReelDraftInput {
  return {
    title: readTextField(formData, "title"),
    story: readTextField(formData, "story"),
    cta: readTextField(formData, "cta"),
    style: readTextField(formData, "style"),
  };
}

function validateReelDraftInput(input: ReelDraftInput) {
  const errors: Partial<Record<keyof ReelDraftInput, string>> = {};

  if (!input.title) {
    errors.title = "Вкажи коротку назву Reel.";
  }

  if (!input.story) {
    errors.story = "Встав сюжет або чорновий сценарій.";
  }

  return errors;
}

function readTextField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

