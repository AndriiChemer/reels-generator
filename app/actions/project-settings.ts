"use server";

import { revalidatePath } from "next/cache";
import { saveProjectSettings } from "@/lib/project-settings";
import type { ProjectSettingsInput } from "@/lib/types/project";

export type ProjectSettingsFormState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Partial<Record<keyof ProjectSettingsInput, string>>;
};

export async function saveProjectSettingsAction(
  _previousState: ProjectSettingsFormState,
  formData: FormData,
): Promise<ProjectSettingsFormState> {
  const input = readProjectSettingsInput(formData);
  const errors = validateProjectSettingsInput(input);

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Перевір поля форми перед збереженням.",
      errors,
    };
  }

  await saveProjectSettings(input);
  revalidatePath("/");

  return {
    status: "success",
    message: "Налаштування збережено локально.",
  };
}

function readProjectSettingsInput(formData: FormData): ProjectSettingsInput {
  return {
    appName: readTextField(formData, "appName"),
    appDescription: readTextField(formData, "appDescription"),
    targetAudience: readTextField(formData, "targetAudience"),
    marketingAngle: readTextField(formData, "marketingAngle"),
    defaultCta: readTextField(formData, "defaultCta"),
    contentStyle: readTextField(formData, "contentStyle"),
  };
}

function readTextField(formData: FormData, fieldName: string) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value.trim() : "";
}

function validateProjectSettingsInput(input: ProjectSettingsInput) {
  const errors: Partial<Record<keyof ProjectSettingsInput, string>> = {};

  if (!input.appName) {
    errors.appName = "Вкажи назву застосунку.";
  }

  if (!input.appDescription) {
    errors.appDescription = "Додай короткий опис застосунку.";
  }

  return errors;
}
