"use client";

import { useActionState } from "react";
import { createReelDraftAction } from "@/app/actions/reels";
import type { ReelDraftFormState } from "@/app/actions/reels";

const initialReelDraftFormState: ReelDraftFormState = {
  status: "idle",
  message: "",
};

export function StoryForm() {
  const [state, formAction, isPending] = useActionState(
    createReelDraftAction,
    initialReelDraftFormState,
  );

  return (
    <form action={formAction} className="grid gap-5">
      <TextField
        error={state.errors?.title}
        label="Назва Reel"
        name="title"
        placeholder="Наприклад: Перше побачення після токсичних стосунків"
        required
      />

      <TextAreaField
        error={state.errors?.story}
        label="Сюжет"
        name="story"
        placeholder="Встав сюди свою ідею, сюжет або чорновий сценарій. У цьому MVP AI не вигадує сюжет з нуля."
        required
        rows={10}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          error={state.errors?.cta}
          label="CTA"
          name="cta"
          placeholder="Наприклад: Завантаж застосунок"
        />
        <TextField
          error={state.errors?.style}
          label="Стиль"
          name="style"
          placeholder="UGC, діалог, гумор, сторітелінг"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="w-full rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Створення..." : "Створити чернетку Reel"}
        </button>

        {state.message ? (
          <p aria-live="polite" className="text-sm font-medium text-red-700">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

type FieldProps = {
  error?: string;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
};

function TextField({ error, label, name, placeholder, required }: FieldProps) {
  const fieldId = `reel-${name}`;

  return (
    <label className="grid gap-2" htmlFor={fieldId}>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
        id={fieldId}
        name={name}
        placeholder={placeholder}
        required={required}
        type="text"
      />
      <FieldError error={error} id={`${fieldId}-error`} />
    </label>
  );
}

function TextAreaField({
  error,
  label,
  name,
  placeholder,
  required,
  rows,
}: FieldProps & { rows: number }) {
  const fieldId = `reel-${name}`;

  return (
    <label className="grid gap-2" htmlFor={fieldId}>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <textarea
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="min-h-48 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
        id={fieldId}
        name={name}
        placeholder={placeholder}
        required={required}
        rows={rows}
      />
      <FieldError error={error} id={`${fieldId}-error`} />
    </label>
  );
}

function FieldError({ error, id }: { error?: string; id: string }) {
  if (!error) {
    return null;
  }

  return (
    <span className="text-sm text-red-700" id={id}>
      {error}
    </span>
  );
}
