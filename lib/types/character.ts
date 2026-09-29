export type Character = {
  id: string;
  name: string;
  age?: string;
  description?: string;
  appearance?: string;
  personality?: string;
  clothes?: string;
  referenceImages: string[];
  voiceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CharacterInput = Pick<Character, "name"> &
  Partial<
    Pick<
      Character,
      "age" | "description" | "appearance" | "personality" | "clothes" | "voiceId"
    >
  > & {
    referenceImagesText: string;
  };
