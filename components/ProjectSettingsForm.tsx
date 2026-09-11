"use client";

import { useActionState } from "react";
import { saveProjectSettingsAction } from "@/app/actions/project-settings";
import type { ProjectSettingsFormState } from "@/app/actions/project-settings";
import type { ProjectSettings } from "@/lib/types/project";

type ProjectSettingsFormProps = {
  settings: ProjectSettings;
};

const initialProjectSettingsFormState: ProjectSettingsFormState = {
  status: "idle",
  message: "",
};

type ProjectSettingsField = {
  name: keyof Pick<
    ProjectSettings,
    | "appName"
    | "appDescription"
    | "targetAudience"
    | "marketingAngle"
    | "defaultCta"
    | "contentStyle"
  >;
  label: string;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
};

const fields = [
  {
    name: "appName",
    label: "Назва застосунку",
    placeholder: "Наприклад: Rem",
    required: true,
  },
  {
    name: "appDescription",
    label: "Опис застосунку",
    placeholder: "Коротко: що робить застосунок і для кого він",
    required: true,
    multiline: true,
  },
  {
    name: "targetAudience",
    label: "Цільова аудиторія",
    placeholder: "Хто має побачити ці Reels",
  },
  {
    name: "marketingAngle",
    label: "Маркетинговий кут",
    placeholder: "Емоція, біль або ситуація",
  },
  {
    name: "defaultCta",
    label: "Default CTA",
    placeholder: "Наприклад: Завантажити застосунок",
  },
  {
    name: "contentStyle",
    label: "Стиль контенту",
    placeholder: "UGC, діалог, гумор, storytelling",
  },
] satisfies ProjectSettingsField[];

export function ProjectSettingsForm({ settings }: ProjectSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveProjectSettingsAction,
    initialProjectSettingsFormState,
  );

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      {fields.map((field) => {
        const error = state.errors?.[field.name];
        const fieldId = `project-${field.name}`;
        const describedBy = error ? `${fieldId}-error` : undefined;

        return (
          <label key={field.name} className="grid gap-2" htmlFor={fieldId}>
            <span className="text-sm font-medium text-[var(--foreground)]">
              {field.label}
            </span>

            {field.multiline ? (
              <textarea
                aria-describedby={describedBy}
                aria-invalid={Boolean(error)}
                className="min-h-28 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
                defaultValue={settings[field.name]}
                id={fieldId}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : (
              <input
                aria-describedby={describedBy}
                aria-invalid={Boolean(error)}
                className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
                defaultValue={settings[field.name]}
                id={fieldId}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                type="text"
              />
            )}

            {error ? (
              <span className="text-sm text-red-700" id={`${fieldId}-error`}>
                {error}
              </span>
            ) : null}
          </label>
        );
      })}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="w-fit rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Збереження..." : "Зберегти налаштування"}
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
