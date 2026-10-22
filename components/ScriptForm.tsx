"use client";

import { useActionState } from "react";
import { saveReelScriptAction } from "@/app/actions/scenes";
import type { ReelScriptFormState } from "@/app/actions/reel-script-form";
import { FormStatus } from "@/components/form-fields";
import { ReelScriptFields } from "@/components/ReelScriptFields";
import type { Character } from "@/lib/types/character";
import type { ReelDraft } from "@/lib/types/reel";

const initialState: ReelScriptFormState = { status: "idle", message: "" };

/** Edits the look and the script of an existing reel. */
export function ScriptForm({
  characters,
  reel,
  sourceText,
}: {
  characters: Character[];
  reel: ReelDraft;
  sourceText?: string;
}) {
  const [state, formAction, isPending] = useActionState(
    saveReelScriptAction.bind(null, reel.id),
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <ReelScriptFields
        characters={characters}
        errors={state.errors}
        reel={reel}
        sourceText={sourceText}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Збереження…" : "Зберегти сценарій"}
        </button>
        <FormStatus message={state.message} status={state.status} />
      </div>
    </form>
  );
}
