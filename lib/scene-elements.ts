import { findReferencePath, type ReferenceAsset } from "@/lib/references";
import type { Character } from "@/lib/types/character";
import type { ReelScene } from "@/lib/types/reel";

/**
 * Something with reference images that must look the same in every shot:
 * a character (@mia) or a project reference (#logo, #dashboard).
 *
 * The order of this list is the contract between prompts and providers:
 * the N-th element is `@ElementN` for Kling and the matching images go to
 * the keyframe model in the same order.
 */
export type SceneElement = {
  sign: "@" | "#";
  /** Normalized mention without the sign, e.g. "mia". */
  mention: string;
  name: string;
  imagePaths: string[];
  /** Appearance notes from the character card. */
  appearance?: string;
};

export function resolveSceneElements(
  scene: ReelScene,
  characters: Character[],
  referenceAssets: ReferenceAsset[],
): SceneElement[] {
  const characterElements = scene.characterIds.flatMap(
    (characterId): SceneElement[] => {
      const character = characters.find(({ id }) => id === characterId);
      const imagePaths = character?.referenceImages.filter(Boolean) ?? [];

      if (!character || imagePaths.length === 0) {
        return [];
      }

      return [
        {
          sign: "@",
          mention: normalizeMention(character.name),
          name: character.name,
          imagePaths,
          appearance: joinText([character.appearance, character.clothes]),
        },
      ];
    },
  );
  const referenceElements = scene.referenceNames.flatMap(
    (referenceName): SceneElement[] => {
      const referencePath = findReferencePath(referenceName, referenceAssets);

      return referencePath
        ? [
            {
              sign: "#",
              mention: normalizeMention(referenceName),
              name: referenceName,
              imagePaths: [referencePath],
            },
          ]
        : [];
    },
  );

  return removeDuplicateImages([...characterElements, ...referenceElements]);
}

export function findElementIndex(
  elements: SceneElement[],
  sign: string,
  mention: string,
) {
  const normalized = normalizeMention(mention);

  return elements.findIndex(
    (element) => element.sign === sign && element.mention === normalized,
  );
}

export function normalizeMention(value: string) {
  return value.trim().toLowerCase();
}

function removeDuplicateImages(elements: SceneElement[]) {
  const seen = new Set<string>();

  return elements.filter((element) => {
    const key = element.imagePaths.join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function joinText(values: Array<string | undefined>) {
  const text = values.filter(Boolean).join("; ");

  return text || undefined;
}
