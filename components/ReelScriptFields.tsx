import { SelectField, TextAreaField, TextField } from "@/components/form-fields";
import type { ReelScriptFormState } from "@/app/actions/reel-script-form";
import type { Character } from "@/lib/types/character";
import type { ReelDraft } from "@/lib/types/reel";
import { DEFAULT_VOICE_MOOD, VOICE_MOODS, VOICE_SPEED_OPTIONS } from "@/lib/voice";

const ART_STYLE_OPTIONS = [
  { value: "reference", label: "Як на фото персонажів" },
  { value: "animated3d", label: "3D-анімація" },
  { value: "photoreal", label: "Фотореалізм" },
];

const VOICE_MOOD_OPTIONS = Object.entries(VOICE_MOODS).map(([value, mood]) => ({
  value,
  label: mood.label,
}));

const VOICE_SPEED_SELECT_OPTIONS = [
  { value: "", label: "За настроєм" },
  ...VOICE_SPEED_OPTIONS.map((speed) => ({ value: String(speed), label: `${speed}×` })),
];

const SCRIPT_PLACEHOLDER = `Сцена 1:
@mia sits on the couch with her phone, slow push-in from the side.
Тривалість: 4

Звук:
- 2.0–2.5: soft phone notification
- Voiceover 0.6–3.8: “Sometimes the hardest part isn’t the fight…”

Сцена 2:
Перехід: продовження
Close-up of @mia’s hands holding the phone…`;

/** Fields shared by the "new reel" and "edit script" forms. */
export function ReelScriptFields({
  characters,
  errors,
  reel,
  sourceText,
}: {
  characters: Character[];
  errors?: ReelScriptFormState["errors"];
  reel?: ReelDraft;
  sourceText?: string;
}) {
  const narratorOptions = [
    { value: "", label: "Перший @персонаж сцени" },
    ...characters
      .filter((character) => character.voiceId)
      .map((character) => ({ value: character.id, label: character.name })),
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          defaultValue={reel?.title}
          error={errors?.title}
          label="Назва"
          name="title"
          placeholder="When there is silence between you"
          required
        />
        <TextField
          defaultValue={reel?.story}
          hint="1–2 речення"
          label="Ідея"
          name="story"
          placeholder="Про що рілс і яку емоцію він має залишити"
        />
      </div>

      <fieldset className="grid gap-4 rounded-md border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold">
          Вигляд — однаковий у кожній сцені
        </legend>
        <SelectField
          defaultValue={reel?.artStyle ?? "reference"}
          hint="як у референсів персонажів"
          label="Художній стиль"
          name="artStyle"
          options={ART_STYLE_OPTIONS}
        />
        <TextAreaField
          defaultValue={reel?.setting}
          label="Локація"
          name="setting"
          placeholder="Cozy small apartment in the evening: grey couch, warm floor lamp, open kitchen behind…"
          rows={2}
        />
        <TextAreaField
          defaultValue={reel?.wardrobe}
          label="Одяг"
          name="wardrobe"
          placeholder="Mia: cream knit sweater. Ethan: navy t-shirt."
          rows={2}
        />
        <TextAreaField
          defaultValue={reel?.style}
          label="Стиль зйомки"
          name="style"
          placeholder="Cinematic, warm evening light, shallow depth of field, soft color grade"
          rows={2}
        />
      </fieldset>

      <fieldset className="grid gap-4 rounded-md border border-[var(--border)] p-4 sm:grid-cols-3">
        <legend className="px-1 text-sm font-semibold">
          Голос за кадром — один на весь рілс
        </legend>
        <SelectField
          defaultValue={reel?.narratorCharacterId ?? ""}
          label="Хто читає"
          name="narratorCharacterId"
          options={narratorOptions}
        />
        <SelectField
          defaultValue={reel?.voiceMood ?? DEFAULT_VOICE_MOOD}
          label="Настрій"
          name="voiceMood"
          options={VOICE_MOOD_OPTIONS}
        />
        <SelectField
          defaultValue={reel?.voiceSpeed ? String(reel.voiceSpeed) : ""}
          label="Темп"
          name="voiceSpeed"
          options={VOICE_SPEED_SELECT_OPTIONS}
        />
      </fieldset>

      <TextAreaField
        defaultValue={sourceText}
        error={errors?.sourceText}
        hint="@персонаж, #референс, «Перехід: продовження» — без склейки з попередньою сценою"
        label="Сцени"
        name="sourceText"
        placeholder={SCRIPT_PLACEHOLDER}
        required
        rows={16}
      />
    </div>
  );
}
