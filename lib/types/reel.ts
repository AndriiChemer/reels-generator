export type ReelDraft = {
  id: string;
  title: string;
  story: string;
  cta?: string;
  style?: string;
  finalOutputPath?: string;
  finalRenderedAt?: string;
  finalRenderError?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReelDraftInput = Pick<ReelDraft, "title" | "story"> &
  Partial<Pick<ReelDraft, "cta" | "style">>;

export type ReelSceneStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export type ReelScene = {
  id: string;
  order: number;
  rawText: string;
  durationSeconds: number;
  videoPrompt: string;
  characterNames: string[];
  characterIds: string[];
  referenceNames: string[];
  referencePaths: string[];
  status: ReelSceneStatus;
  outputPath?: string;
};

export type ReelScenesDocument = {
  sourceText: string;
  scenes: ReelScene[];
  updatedAt: string;
};

export type ReelScenesInput = {
  sourceText: string;
};
