"use client";

import { useActionState } from "react";
import { createReelAction } from "@/app/actions/reels";
import type { ReelScriptFormState } from "@/app/actions/reel-script-form";
import { FormStatus } from "@/components/form-fields";
import { ReelScriptFields } from "@/components/ReelScriptFields";
import type { Character } from "@/lib/types/character";

const initialState: ReelScriptFormState = { status: "idle", message: "" };

/** Form for a new reel: idea, shared look and the scene script. */
export function StoryForm({ characters }: { characters: Character[] }) {
  const [state, formAction, isPending] = useActionState(
    createReelAction,
    initialState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <ReelScriptFields characters={characters} errors={state.errors} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Створення…" : "Створити рілс"}
        </button>
        <FormStatus message={state.message} status={state.status} />
      </div>
    </form>
  );
}
