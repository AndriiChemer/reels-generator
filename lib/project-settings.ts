import {
  DATA_DIR,
  DEFAULT_PROJECT_ID,
  DEFAULT_PROJECT_SETTINGS_PATH,
  assertInsideRoot,
} from "@/lib/files/paths";
import { readJsonFile, writeJsonFile } from "@/lib/files/json";
import type {
  ProjectSettings,
  ProjectSettingsInput,
} from "@/lib/types/project";

const DEFAULT_SETTINGS: ProjectSettings = {
  id: DEFAULT_PROJECT_ID,
  appName: "",
  appDescription: "",
  targetAudience: "",
  marketingAngle: "",
  defaultCta: "",
  contentStyle: "",
  createdAt: "",
  updatedAt: "",
};

export async function readProjectSettings(): Promise<ProjectSettings> {
  assertInsideRoot(DATA_DIR, DEFAULT_PROJECT_SETTINGS_PATH);

  const savedSettings = await readJsonFile<ProjectSettings>(
    DEFAULT_PROJECT_SETTINGS_PATH,
  );

  if (!savedSettings) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...savedSettings,
    id: DEFAULT_PROJECT_ID,
  };
}

export async function saveProjectSettings(input: ProjectSettingsInput) {
  assertInsideRoot(DATA_DIR, DEFAULT_PROJECT_SETTINGS_PATH);

  const currentSettings = await readProjectSettings();
  const now = new Date().toISOString();

  const nextSettings: ProjectSettings = {
    ...currentSettings,
    ...input,
    id: DEFAULT_PROJECT_ID,
    createdAt: currentSettings.createdAt || now,
    updatedAt: now,
  };

  await writeJsonFile(DEFAULT_PROJECT_SETTINGS_PATH, nextSettings);

  return nextSettings;
}

