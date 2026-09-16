import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");
export const OUTPUTS_DIR = path.join(process.cwd(), "outputs");
export const OUTPUT_SCENES_DIR = path.join(OUTPUTS_DIR, "scenes");
export const OUTPUT_REELS_DIR = path.join(OUTPUTS_DIR, "reels");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
export const DEFAULT_PROJECT_ID = "default";
export const DEFAULT_PROJECT_DIR = path.join(PROJECTS_DIR, DEFAULT_PROJECT_ID);
export const DEFAULT_PROJECT_CHARACTERS_DIR = path.join(
  DEFAULT_PROJECT_DIR,
  "characters",
);
export const DEFAULT_PROJECT_REFERENCES_DIR = path.join(
  DEFAULT_PROJECT_DIR,
  "references",
);
export const DEFAULT_PROJECT_REELS_DIR = path.join(
  DEFAULT_PROJECT_DIR,
  "reels",
);
export const DEFAULT_PROJECT_SETTINGS_PATH = path.join(
  DEFAULT_PROJECT_DIR,
  "project.json",
);

export function assertInsideRoot(rootPath: string, targetPath: string) {
  const relativePath = path.relative(rootPath, targetPath);
  const isInsideRoot =
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));

  if (!isInsideRoot) {
    throw new Error("Path is outside the allowed project directory.");
  }
}
