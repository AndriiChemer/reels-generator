import { unlink } from "node:fs/promises";
import path from "node:path";
import {
  DATA_DIR,
  DEFAULT_PROJECT_CHARACTERS_DIR,
  assertInsideRoot,
} from "@/lib/files/paths";
import { readJsonFile, readJsonFilesFromDir, writeJsonFile } from "@/lib/files/json";
import type { Character, CharacterInput } from "@/lib/types/character";

export async function listCharacters(): Promise<Character[]> {
  assertInsideRoot(DATA_DIR, DEFAULT_PROJECT_CHARACTERS_DIR);

  const characters = await readJsonFilesFromDir<Character>(
    DEFAULT_PROJECT_CHARACTERS_DIR,
  );

  return characters
    .filter((character): character is Character => Boolean(character))
    .sort((left, right) => left.name.localeCompare(right.name, "uk"));
}

export async function saveCharacter(input: CharacterInput, characterId?: string) {
  const now = new Date().toISOString();
  const id = characterId || (await createUniqueCharacterId(input.name));
  const filePath = getCharacterFilePath(id);
  const currentCharacter = await readJsonFile<Character>(filePath);

  const character: Character = {
    id,
    name: input.name.trim(),
    age: optionalText(input.age),
    description: input.description.trim(),
    appearance: input.appearance.trim(),
    personality: input.personality.trim(),
    clothes: optionalText(input.clothes),
    referenceImages: parseReferenceImages(input.referenceImagesText),
    voiceId: optionalText(input.voiceId),
    createdAt: currentCharacter?.createdAt || now,
    updatedAt: now,
  };

  await writeJsonFile(filePath, character);

  return character;
}

export async function deleteCharacter(characterId: string) {
  const filePath = getCharacterFilePath(characterId);

  try {
    await unlink(filePath);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

export function getCharacterFilePath(characterId: string) {
  const safeCharacterId = sanitizeCharacterId(characterId);
  const filePath = path.join(
    DEFAULT_PROJECT_CHARACTERS_DIR,
    `${safeCharacterId}.json`,
  );

  assertInsideRoot(DEFAULT_PROJECT_CHARACTERS_DIR, filePath);

  return filePath;
}

export function validateReferenceImages(referenceImagesText: string) {
  const invalidPaths = parseReferenceImages(referenceImagesText).filter(
    (referencePath) =>
      path.isAbsolute(referencePath) ||
      referencePath.includes("..") ||
      referencePath.startsWith("/"),
  );

  return invalidPaths;
}

function parseReferenceImages(referenceImagesText: string) {
  return referenceImagesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function createUniqueCharacterId(name: string) {
  const baseId = slugify(name) || "character";
  let id = baseId;
  let index = 2;

  while (await readJsonFile<Character>(getCharacterFilePath(id))) {
    id = `${baseId}-${index}`;
    index += 1;
  }

  return id;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sanitizeCharacterId(characterId: string) {
  const sanitized = slugify(characterId);

  if (!sanitized) {
    throw new Error("Invalid character id.");
  }

  return sanitized;
}

function optionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

