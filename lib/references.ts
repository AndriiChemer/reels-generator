import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  REFERENCES_DIR,
  assertInsideRoot,
} from "@/lib/files/paths";

const SUPPORTED_REFERENCE_EXTENSIONS = new Set([
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

export type ReferenceAsset = {
  name: string;
  path: string;
};

export async function listReferenceAssets(): Promise<ReferenceAsset[]> {
  assertInsideRoot(process.cwd(), REFERENCES_DIR);

  const filePaths = await listReferenceFiles(REFERENCES_DIR);

  return filePaths
    .map((filePath) => ({
      name: path.basename(filePath, path.extname(filePath)).toLowerCase(),
      path: toProjectRelativePath(filePath),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "uk"));
}

export function findReferencePath(
  referenceName: string,
  referenceAssets: ReferenceAsset[],
) {
  const normalizedName = normalizeReferenceName(referenceName);
  const referenceAsset = referenceAssets.find(
    (asset) => normalizeReferenceName(asset.name) === normalizedName,
  );

  return referenceAsset?.path;
}

function normalizeReferenceName(referenceName: string) {
  return referenceName.trim().toLowerCase();
}

async function listReferenceFiles(directoryPath: string): Promise<string[]> {
  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const nestedFileGroups = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directoryPath, entry.name);

        assertInsideRoot(REFERENCES_DIR, entryPath);

        if (entry.isDirectory()) {
          return listReferenceFiles(entryPath);
        }

        if (
          entry.isFile() &&
          SUPPORTED_REFERENCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
        ) {
          return [entryPath];
        }

        return [];
      }),
    );

    return nestedFileGroups.flat();
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function toProjectRelativePath(filePath: string) {
  assertInsideRoot(process.cwd(), filePath);

  return path.relative(process.cwd(), filePath).split(path.sep).join("/");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
