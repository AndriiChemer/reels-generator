"use server";

import { revalidatePath } from "next/cache";
import {
  readReelScriptInput,
  validateReelScriptInput,
  type ReelScriptFormState,
} from "@/app/actions/reel-script-form";
import { listCharacters } from "@/lib/characters";
import { listReferenceAssets } from "@/lib/references";
import { updateReelDraft } from "@/lib/reels";
import { saveReelScenes } from "@/lib/scenes";

/** Saves the reel look and re-parses the scene script. */
export async function saveReelScriptAction(
  reelId: string,
  _previousState: ReelScriptFormState,
  formData: FormData,
): Promise<ReelScriptFormState> {
  const input = readReelScriptInput(formData);
  const errors = validateReelScriptInput(input);

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Перевір поля.", errors };
  }

  const [characters, referenceAssets] = await Promise.all([
    listCharacters(),
    listReferenceAssets(),
  ]);

  await updateReelDraft(reelId, input);
  await saveReelScenes(reelId, input.sourceText, characters, referenceAssets);
  revalidatePath(`/reels/${reelId}`);

  return {
    status: "success",
    message: "Збережено. Кадри, відео й звук лишились там, де їх частина сцени не змінилась.",
  };
}
