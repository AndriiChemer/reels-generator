"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  readReelScriptInput,
  validateReelScriptInput,
  type ReelScriptFormState,
} from "@/app/actions/reel-script-form";
import { listCharacters } from "@/lib/characters";
import { listReferenceAssets } from "@/lib/references";
import { createReelDraft } from "@/lib/reels";
import { saveReelScenes } from "@/lib/scenes";

export async function createReelAction(
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
  const reel = await createReelDraft(input);

  await saveReelScenes(reel.id, input.sourceText, characters, referenceAssets);

  revalidatePath("/reels/new");
  redirect(`/reels/${reel.id}`);
}
