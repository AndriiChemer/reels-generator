export type ReelDraft = {
  id: string;
  title: string;
  story: string;
  cta?: string;
  style?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReelDraftInput = Pick<ReelDraft, "title" | "story"> &
  Partial<Pick<ReelDraft, "cta" | "style">>;

