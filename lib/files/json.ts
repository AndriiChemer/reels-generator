import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const file = await readFile(filePath, "utf8");
    return JSON.parse(file) as T;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T) {
  await mkdir(path.dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  const serializedData = `${JSON.stringify(data, null, 2)}\n`;

  await writeFile(temporaryPath, serializedData, "utf8");
  await rename(temporaryPath, filePath);
}

export async function readJsonFilesFromDir<T>(directoryPath: string) {
  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const jsonFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => path.join(directoryPath, entry.name));

    return Promise.all(
      jsonFiles.map(async (filePath) => readJsonFile<T>(filePath)),
    );
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
