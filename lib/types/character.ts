export type Character = {
  id: string;
  name: string;
  age?: string;
  description: string;
  appearance: string;
  personality: string;
  clothes?: string;
  referenceImages: string[];
  voiceId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CharacterInput = Pick<
  Character,
  "name" | "description" | "appearance" | "personality"
> &
  Partial<Pick<Character, "age" | "clothes" | "voiceId">> & {
    referenceImagesText: string;
  };

