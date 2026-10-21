export type ReelDraft = {
  id: string;
  title: string;
  story: string;
  cta?: string;
  style?: string;
  finalOutputPath?: string;
  finalRenderedAt?: string;
  finalRenderError?: string;
  backgroundAudio?: ReelBackgroundAudioOutput;
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

export type SceneAudioPlanSource = "explicit" | "auto";

export type SceneAudioSpeechPolicy = "no_speech" | "dialogue_expected";

export type SceneAudioCue = {
  description: string;
  startSeconds?: number;
  endSeconds?: number;
};

export type SceneAudioPlan = {
  source: SceneAudioPlanSource;
  prompt: string;
  durationSeconds: number;
  speechPolicy: SceneAudioSpeechPolicy;
  ambiencePrompt?: string;
  musicPrompt?: string;
  voicePrompt?: string;
  sfx: SceneAudioCue[];
  rawText?: string;
};

export type SceneAudioOutput = {
  provider: "elevenlabs";
  model: string;
  outputPath: string;
  durationSeconds: number;
  characterCost?: number;
  generatedAt: string;
};

export type SceneVoiceoverOutput = {
  provider: "elevenlabs";
  model: string;
  outputPath: string;
  text: string;
  speakerCharacterId: string;
  speakerName: string;
  speakerVoiceId: string;
  startSeconds: number;
  endSeconds: number;
  emotion: VoiceoverEmotion;
  speechRate: number;
  speedAppliedNatively?: boolean;
  characterCost?: number;
  generatedAt: string;
};

export type VoiceoverEmotion =
  | "neutral"
  | "sad"
  | "warm"
  | "calm"
  | "energetic";

export type ReelBackgroundAudioOutput = {
  provider: "elevenlabs";
  model: string;
  outputPath: string;
  durationSeconds: number;
  characterCost?: number;
  generatedAt: string;
};

export type ReelScene = {
  id: string;
  order: number;
  rawText: string;
  durationSeconds: number;
  videoPrompt: string;
  audioPlan: SceneAudioPlan;
  characterNames: string[];
  characterIds: string[];
  referenceNames: string[];
  referencePaths: string[];
  status: ReelSceneStatus;
  outputPath?: string;
  audioOutput?: SceneAudioOutput;
  voiceoverOutput?: SceneVoiceoverOutput;
  previewOutputPath?: string;
  previewRenderedAt?: string;
  previewRenderError?: string;
};

export type ReelScenesDocument = {
  sourceText: string;
  scenes: ReelScene[];
  updatedAt: string;
};

export type ReelScenesInput = {
  sourceText: string;
};
