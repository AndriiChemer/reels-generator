"use client";

import { useActionState } from "react";
import { saveCharacterAction } from "@/app/actions/characters";
import type { CharacterFormState } from "@/app/actions/characters";
import type { Character } from "@/lib/types/character";

type CharacterFormProps = {
  character?: Character;
};

const initialCharacterFormState: CharacterFormState = {
  status: "idle",
  message: "",
};

export function CharacterForm({ character }: CharacterFormProps) {
  const saveAction = saveCharacterAction.bind(null, character?.id);
  const [state, formAction, isPending] = useActionState(
    saveAction,
    initialCharacterFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          error={state.errors?.name}
          label="Імʼя"
          name="name"
          placeholder="Наприклад: Sofia"
          required
          value={character?.name}
        />
        <TextField
          error={state.errors?.age}
          label="Вік"
          name="age"
          placeholder="Наприклад: 28"
          value={character?.age}
        />
      </div>

      <TextAreaField
        error={state.errors?.description}
        label="Короткий опис"
        name="description"
        placeholder="Роль персонажа у відео, що він або вона уособлює"
        required
        value={character?.description}
      />

      <TextAreaField
        error={state.errors?.appearance}
        label="Зовнішність"
        name="appearance"
        placeholder="Обличчя, зачіска, візуальні особливості"
        required
        value={character?.appearance}
      />

      <TextAreaField
        error={state.errors?.personality}
        label="Характер"
        name="personality"
        placeholder="Темперамент, манера говорити, емоційний стиль"
        required
        value={character?.personality}
      />

      <TextAreaField
        error={state.errors?.clothes}
        label="Одяг"
        name="clothes"
        placeholder="Типовий образ персонажа"
        value={character?.clothes}
      />

      <TextAreaField
        error={state.errors?.referenceImagesText}
        label="Reference images"
        name="referenceImagesText"
        placeholder={"references/sofia/reference-01.png\nreferences/sofia/reference-02.png"}
        value={character?.referenceImages.join("\n")}
      />

      <TextField
        error={state.errors?.voiceId}
        label="Voice ID"
        name="voiceId"
        placeholder="Опційно для майбутньої озвучки"
        value={character?.voiceId}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="w-fit rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending
            ? "Збереження..."
            : character
              ? "Оновити персонажа"
              : "Створити персонажа"}
        </button>

        {state.message ? (
          <p
            aria-live="polite"
            className={
              state.status === "success"
                ? "text-sm font-medium text-[var(--accent-strong)]"
                : "text-sm font-medium text-red-700"
            }
          >
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
  value?: string;
};

function TextField({
  error,
  label,
  name,
  placeholder,
  required,
  value,
}: FieldProps) {
  const fieldId = `character-${name}`;

  return (
    <label className="grid gap-2" htmlFor={fieldId}>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <input
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
        defaultValue={value}
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
  value,
}: FieldProps) {
  const fieldId = `character-${name}`;

  return (
    <label className="grid gap-2" htmlFor={fieldId}>
      <span className="text-sm font-medium text-[var(--foreground)]">
        {label}
      </span>
      <textarea
        aria-describedby={error ? `${fieldId}-error` : undefined}
        aria-invalid={Boolean(error)}
        className="min-h-24 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
        defaultValue={value}
        id={fieldId}
        name={name}
        placeholder={placeholder}
        required={required}
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
