/**
 * How the picture is rendered. "reference" copies the look of the character
 * reference images, so stylized characters stay stylized.
 */
export type ReelArtStyle = "reference" | "animated3d" | "photoreal";

export type ReelDraft = {
  id: string;
  title: string;
  /** Short idea of the reel: what happens and why. */
  story: string;
  cta?: string;
  /** Rendering style of every frame. Undefined means "reference". */
  artStyle?: ReelArtStyle;
  /** Visual look shared by every scene: camera, light, color grade. */
  style?: string;
  /** Where the action happens. Repeated in every keyframe for continuity. */
  setting?: string;
  /** What each character wears in this reel. */
  wardrobe?: string;
  /** Character whose voice reads every "Voiceover" line of this reel. */
  narratorCharacterId?: string;
  /** Delivery of the narrator for the whole reel. Undefined means "calm". */
  voiceMood?: VoiceoverEmotion;
  /** Speech speed override; undefined uses the mood default. */
  voiceSpeed?: number;
  finalOutputPath?: string;
  finalRenderedAt?: string;
  finalRenderError?: string;
  backgroundAudio?: ReelBackgroundAudioOutput;
  createdAt: string;
  updatedAt: string;
};

export type ReelLookInput = Partial<
  Pick<ReelDraft, "artStyle" | "style" | "setting" | "wardrobe">
>;

export type ReelDraftInput = Pick<ReelDraft, "title" | "story"> &
  ReelLookInput &
  Partial<Pick<ReelDraft, "narratorCharacterId" | "voiceMood" | "voiceSpeed">>;

export type ReelScriptInput = ReelDraftInput & {
  /** Scene script with @character and #reference mentions. */
  sourceText: string;
};

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
  /** Real length of the generated clip, if ffprobe is available. */
  durationSeconds?: number;
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

/**
 * How a scene connects to the previous one.
 * - cut: a normal edit, new camera angle.
 * - continue: the camera flows from the previous shot without a cut.
 */
export type SceneTransition = "cut" | "continue";

export type SceneKeyframe = {
  provider: "fal";
  model: string;
  outputPath: string;
  prompt: string;
  /** generatedAt of the previous scene keyframe used as a continuity reference. */
  previousKeyframeVersion?: string;
  /** Reel look (art style, location, wardrobe, style) the keyframe was made with. */
  lookVersion?: string;
  estimatedCostUsd?: number;
  generatedAt: string;
};

export type ReelScene = {
  id: string;
  order: number;
  rawText: string;
  durationSeconds: number;
  /** Seconds from the start of the reel where this scene begins. */
  timelineStartSeconds?: number;
  transition?: SceneTransition;
  /** Clean scene description without durations, captions or audio. */
  videoPrompt: string;
  audioPlan: SceneAudioPlan;
  characterNames: string[];
  characterIds: string[];
  referenceNames: string[];
  referencePaths: string[];
  status: ReelSceneStatus;
  /** Ready-made clip from references/clips ("Відео: #endcard"); no AI generation. */
  clipName?: string;
  /** Where the scene video came from. Undefined means "generated". */
  videoSource?: "generated" | "clip";
  keyframe?: SceneKeyframe;
  outputPath?: string;
  /** keyframe.generatedAt that the current video was generated from. */
  videoKeyframeVersion?: string;
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
