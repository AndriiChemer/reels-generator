# AI Providers

## Загальний підхід

У V1 video і audio розділені. Video provider генерує короткі кліпи сцен, а audio provider генерує sound bed / SFX для цих сцен.

Архітектура залишає маленькі інтерфейси, щоб пізніше додати другого provider без переписування UI та storage flow.

Не треба одразу інтегрувати fal.ai, Google Veo, Kling, WAN, Seedance і Runway одночасно. Це збільшить кількість edge cases до того, як буде робочий MVP.

## OpenAI

### Purpose

У першому MVP OpenAI не генерує сюжет з нуля. Користувач сам вставляє сюжет, чорновий сценарій і ручний блок сцен.

OpenAI не потрібен для першої ручної версії сцен. Після локального end-to-end flow його можна використати для структурних задач:

- split ручного сюжету на сцени;
- генерація prompts для video model;
- легке покращення dialogue/visual descriptions, якщо користувач це явно запускає.

Пізніше OpenAI можна використати для:

- генерації Reel ideas;
- генерації hooks;
- генерації короткого сценарію;
- діалогів персонажів;
- CTA variants.

### Очікувані responses

#### Story input

```ts
export type UserStoryInput = {
  title: string;
  story: string;
  cta?: string;
  style?: string;
};
```

#### Scenes from user story

Цей response type потрібен пізніше, коли буде доданий AI-assisted split. Для task 06 сцени вводяться вручну й зберігаються без OpenAI.

```ts
export type ScenesFromStoryResponse = {
  scenes: {
    order: number;
    durationSeconds: number;
    dialogue?: string;
    visualDescription: string;
    videoPrompt: string;
    characterIds: string[];
  }[];
};
```

### Де мають жити промпти

```text
lib/ai/prompts/
  ideas.ts
  scenes.ts
```

У MVP промпти мають бути короткими й явно просити JSON. Довгі production prompts не потрібні на старті. Промпти не мають вигадувати новий сюжет, якщо користувач просить лише розбити введений текст на сцени.

## fal.ai

### Purpose

fal.ai рекомендований як перший video provider для генерації коротких сцен.

### General integration concept

Схема:

```text
scene videoPrompt
  -> fal.ai generation request
  -> generation id або result
  -> status polling / wait
  -> temporary video URL
  -> download MP4 locally
  -> update scene metadata
```

Provider implementation має жити тут:

```text
lib/ai/video-providers/fal.ts
```

Спільні типи:

```text
lib/ai/video-providers/types.ts
```

### Metadata

Кожна генерація має записувати metadata:

```ts
export type GenerationMetadata = {
  id: string;
  reelId: string;
  sceneId: string;
  provider: "fal";
  model: string;
  status: "queued" | "processing" | "completed" | "failed";
  durationSeconds: number;
  estimatedCostUsd?: number;
  temporaryVideoUrl?: string;
  outputPath?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
```

Provider temporary URLs не можна вважати постійним storage. Після completed generation відео треба одразу завантажити у `outputs/`.

## Google Gemini / Veo

### Purpose

Google Veo може бути альтернативним provider для video generation пізніше.

У V1 його не інтегруємо.

Причини:

- MVP має довести flow з одним provider;
- різні providers мають різні формати input/output;
- одночасна підтримка кількох video APIs збільшить кількість коду й тестування;
- простіше спочатку стабілізувати локальне збереження, previews і FFmpeg render.

## Recommended V1 provider

Рекомендація для відео: **fal.ai**.

Чому:

- простіше стартувати для локального prototype;
- один API може дати доступ до кількох video models;
- добре підходить для експериментів зі scenes;
- менше ризику застрягнути в provider-specific setup до того, як працює весь продукт.

## Minimal provider interface

### Video

```ts
export type VideoGenerationInput = {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16";
  characterReferencePaths?: string[];
  assetReferencePaths?: string[];
};

export type VideoGenerationResult = {
  provider: string;
  model: string;
  generationId: string;
  status: "queued" | "processing" | "completed" | "failed";
  temporaryVideoUrl?: string;
  errorMessage?: string;
  estimatedCostUsd?: number;
};

export interface VideoProvider {
  generateVideo(input: VideoGenerationInput): Promise<VideoGenerationResult>;
  getGenerationStatus?(generationId: string): Promise<VideoGenerationResult>;
}
```

### Audio

Перший audio provider: **ElevenLabs Sound Effects**.

ElevenLabs використовується для вибіркової генерації scene SFX:

- foley/SFX для явних звукових подій;
- короткої натуральної атмосфери, якщо вона зазначена разом із SFX;
- без voiceover і фонової музики в першій audio-фазі.

SFX не генерується для кожної сцени автоматично. Користувач додає ручний блок
`Звук:` з конкретними подіями, а застосунок створює один короткий трек для цієї
сцени.

### Фонова музика всього Reel

ElevenLabs Music API створює одну інструментальну доріжку для всього Reel.
Prompt використовує стиль і сюжет Reel, а також рядки з `Звук:`, що описують
музику. Для API key потрібно надати окремий дозвіл `Music Generation: Access`.

Застосунок зберігає MP3 у `outputs/audio/reels/<reelId>/background.mp3` і
накладає його через FFmpeg на всі SFX. Музика навмисно генерується тільки після
явного натискання кнопки в редакторі, щоб не створювати несподівані витрати.

Voice/dialogue краще додавати окремим TTS task, бо там інший timing і voice IDs.

Provider implementation має жити тут:

```text
lib/ai/audio-providers/elevenlabs.ts
```

Спільні типи:

```text
lib/ai/audio-providers/types.ts
lib/types/audio-generation.ts
```

Мінімальний interface:

```ts
export type AudioGenerationInput = {
  prompt: string;
  durationSeconds: number;
  loop?: boolean;
  model?: string;
  outputFormat?: string;
  promptInfluence?: number;
};

export type MusicGenerationInput = {
  prompt: string;
  durationSeconds: number;
  model?: string;
  outputFormat?: string;
};

export type AudioGenerationResult = {
  provider: "elevenlabs";
  model: string;
  audioBytes: ArrayBuffer;
  contentType: string;
  extension: "mp3" | "wav" | "pcm" | "opus" | "ulaw" | "alaw";
  outputFormat: string;
  durationSeconds: number;
  characterCost?: number;
};

export interface AudioProvider {
  generateSoundEffect(input: AudioGenerationInput): Promise<AudioGenerationResult>;
  generateMusic(input: MusicGenerationInput): Promise<AudioGenerationResult>;
}
```

ElevenLabs Sound Effects endpoint повертає аудіо напряму як binary response.
Застосунок записує його в `outputs/audio/scenes/<reelId>/<sceneId>.mp3` і
зберігає metadata у `scenes.json`.

## Environment variables

```bash
OPENAI_API_KEY=
FAL_KEY=
FAL_VIDEO_MODEL=fal-ai/fast-svd/text-to-video
FAL_ESTIMATED_COST_PER_SECOND_USD=
GOOGLE_API_KEY=
VIDEO_PROVIDER=fal
AUDIO_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=
ELEVENLABS_SOUND_EFFECTS_MODEL=eleven_text_to_sound_v2
ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
ELEVENLABS_PROMPT_INFLUENCE=0.45
ELEVENLABS_MUSIC_MODEL=music_v2_5
ELEVENLABS_MUSIC_OUTPUT_FORMAT=mp3_44100_128
```

У V1 `VIDEO_PROVIDER` може бути зафіксований як `fal`, але env-змінна корисна для майбутнього перемикання.

У V1 `AUDIO_PROVIDER` може бути зафіксований як `elevenlabs`. Env-змінна потрібна, щоб пізніше замінити sound provider без зміни scene parser і FFmpeg layer.

`ELEVENLABS_PROMPT_INFLUENCE` має бути від `0` до `1`. Більше значення точніше тримається prompt, менше дає більше варіативності.

`ELEVENLABS_MUSIC_MODEL` за замовчуванням використовує `music_v2_5`. Music API
приймає тривалість від 3 до 600 секунд; локальний MVP не розбиває довші Reel на
кілька музичних генерацій.

## Cost tracking

Кожна generation metadata може містити:

- provider;
- model;
- durationSeconds;
- estimatedCostUsd;
- createdAt.

Якщо provider не повертає вартість, локальний MVP може оцінити її через:

```bash
FAL_ESTIMATED_COST_PER_SECOND_USD=0.05
```

Якщо змінна порожня, `estimatedCostUsd` залишається unknown і UI не має падати.

UI для Reel editor може підсумовувати `estimatedCostUsd` по всіх сценах:

```text
Current Reel estimated generation cost: $X.XX
```

Це не billing system. Це лише локальна visibility для витрат.
