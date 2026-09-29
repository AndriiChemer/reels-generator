# Структура файлів

## Принципи

Структура має бути плоскою, зрозумілою і без зайвих шарів. У MVP немає бази даних, ORM, окремого backend або складних domain modules.

## Запропоноване дерево

```text
reels generator/
  app/
    layout.tsx
    page.tsx
    globals.css
    characters/
      page.tsx
    reels/
      new/
        page.tsx
      [reelId]/
        page.tsx
    actions/
      project-settings.ts
      characters.ts
      reels.ts
      scenes.ts
    api/
      reels/
        [reelId]/
          scenes/
            [sceneId]/
              generate/
                route.ts
              audio/
                generate/
                  route.ts
          audio/
            music/
              generate/
                route.ts
          render/
            route.ts
      generations/
        [generationId]/
          route.ts
      media/
        [...path]/
          route.ts

  components/
    CharacterForm.tsx
    StoryForm.tsx
    SceneEditor.tsx
    VideoPreview.tsx

  lib/
    ai/
      openai.ts
      prompts/
        ideas.ts
        script.ts
        scenes.ts
      audio-providers/
        index.ts
        elevenlabs.ts
        types.ts
      video-providers/
        index.ts
        fal.ts
        types.ts
    files/
      paths.ts
      json.ts
      media.ts
    ffmpeg/
      renderReel.ts
      assertFfmpegAvailable.ts
    types/
      project.ts
      character.ts
      reel.ts
      generation.ts
      audio-generation.ts

  data/
    projects/
      default/
        project.json
        characters/
          character-john.json
          character-sofia.json
        reels/
          reel-001/
            reel.json
            scenes.json
            generations.json

  references/
    characters/
      mia/
        portrait-01.png
        portrait-02.jpg
      ethan/
        portrait-01.png
    app/
      logo/
        logo-primary.png
      screens/
        screen-home.png
        screen-paywall.png

  outputs/
    audio/
      reels/
        reel-001/
          background.mp3
      scenes/
        reel-001/
          scene-01.mp3
    scenes/
      reel-001/
        scene-01.mp4
        scene-02.mp4
    reels/
      reel-001/
        final.mp4

  docs/
    ARCHITECTURE.md
    MVP.md
    SETUP.md
    FILE_STRUCTURE.md
    AI_PROVIDERS.md
    IMPLEMENTATION_PLAN.md

  .env.local
  .env.local.example
  .gitignore
  package.json
  next.config.ts
  tsconfig.json
```

## Важливі папки

### `app/`

Next.js App Router. Тут живуть сторінки, route handlers і global styles.

Для MVP краще не використовувати `src/`, щоб зменшити вкладеність.

### `components/`

Невеликі React components без великої UI-бібліотеки.

Початково достатньо:

- form для персонажа;
- card для ідеї;
- editor для сцени;
- video preview.

### `lib/ai/`

Уся server-side AI-логіка:

- OpenAI client;
- prompts;
- video provider abstraction;
- audio provider abstraction;
- fal.ai provider implementation.

Client components не мають імпортувати файли, які читають API keys.

### `lib/files/`

Мінімальні helper-и для:

- побудови безпечних шляхів;
- читання JSON;
- запису JSON;
- створення папок;
- перевірки media paths.

Це один із небагатьох utility modules, де варто бути уважним, бо path traversal навіть у localhost-проєкті неприємний.

### `lib/ffmpeg/`

Мінімальна логіка для:

- перевірки наявності FFmpeg;
- генерації concat input;
- запуску `ffmpeg`;
- створення `final.mp4`.

### `lib/types/`

Спільні TypeScript типи. Не потрібні складні schemas у V1.

## Дані

### `data/projects/default/project.json`

Основні налаштування мобільного застосунку.

### `data/projects/default/characters/`

Один JSON-файл на персонажа. Так простіше редагувати й не переписувати великий спільний файл.

### `references/`

Локальні візуальні референси. Це вхідні файли, які ти додаєш вручну, тому
папка лежить у корені проєкту, поруч із `data/` та `outputs/`. Реальні медіафайли
ігноруються Git; у репозиторії залишаються тільки `.gitkeep` для структури папок.

Підготовлена структура:

- `references/characters/mia/` для кількох фото або зображень Mia;
- `references/characters/ethan/` для кількох фото або зображень Ethan;
- `references/app/logo/` для кількох варіантів логотипу;
- `references/app/screens/` для знімків екрана застосунку.

У кожну папку можна додати скільки завгодно `.png`, `.jpg`, `.jpeg` або `.webp`.
Для посилання в тексті сцени використовується ім'я файлу без розширення: файл
`references/app/screens/screen-home.png` доступний як `#screen-home`, а
`references/app/logo/logo-primary.png` — як `#logo-primary`.

Персонажа все одно потрібно створити на сторінці `Персонажі` з іменем `Mia` або
`Ethan`, після чого у сцені використовувати `@Mia` або `@Ethan`. Шляхи до кількох
фото можна додати в поле «Референс-зображення» цього персонажа.

У тексті сцен такі assets можна згадувати через короткі aliases:

```text
#logo
#screen-home
#screen-paywall
```

### `data/projects/default/reels/reel-001/`

Дані конкретного Reel:

- `reel.json` для title, ручного story, style, CTA;
- `scenes.json` для оригінального блоку сцен і parsed списку сцен;
- `generations.json` для provider metadata.

Приклад `scenes.json`:

```json
{
  "sourceText": "Сцена 1:\\n@Sofia відкриває застосунок. На екрані #screen-home.",
  "scenes": [
    {
      "id": "scene-01",
      "order": 1,
      "rawText": "@Sofia відкриває застосунок. На екрані #screen-home.",
      "durationSeconds": 4,
      "videoPrompt": "@Sofia відкриває застосунок. На екрані #screen-home.",
      "audioPlan": {
        "source": "explicit",
        "prompt": "Створи цілісний audio bed на 4 секунд для вертикального Reel...",
        "durationSeconds": 4,
        "speechPolicy": "no_speech",
        "sfx": [
          {
            "description": "короткий звук свайпу",
            "startSeconds": 1,
            "endSeconds": 1.5
          }
        ]
      },
      "audioOutput": {
        "provider": "elevenlabs",
        "model": "eleven_text_to_sound_v2",
        "outputPath": "audio/scenes/reel-001/scene-01.mp3",
        "durationSeconds": 4,
        "generatedAt": "2026-09-21T18:00:00.000Z"
      },
      "characterNames": ["Sofia"],
      "characterIds": ["character-sofia"],
      "referenceNames": ["screen-home"],
      "referencePaths": ["references/app/screens/screen-home.png"],
      "status": "draft"
    }
  ]
}
```

## Outputs

### `outputs/scenes/`

Локальні MP4 для окремих сцен.

### `outputs/audio/scenes/`

Локальні SFX-треки тільки для сцен із ручним блоком `Звук:` і конкретними
звуковими подіями.

### `outputs/audio/reels/`

Одна локальна інструментальна фонова доріжка для кожного Reel. Під час render
FFmpeg зміксує її зі SFX сцен у фінальний AAC audio stream.

### `outputs/reels/`

Фінальні MP4.

## Правила іменування

Для файлів і id:

- тільки lowercase;
- `kebab-case`;
- без пробілів;
- без кирилиці в filenames;
- id генерувати як `reel-001`, `scene-01`, `character-john` або через короткий random id;
- розширення файлів залишати стандартними: `.json`, `.mp4`, `.png`, `.jpg`.

UI може показувати українські або будь-які інші назви, але filesystem paths мають бути простими ASCII-рядками.

## Serving local media

Медіа треба віддавати через:

```text
GET /api/media/[...path]
```

Приклад URL:

```text
/api/media/scenes/reel-001/scene-01.mp4
```

Цей route має резолвити шлях до:

```text
outputs/scenes/reel-001/scene-01.mp4
```

і перевіряти, що файл справді всередині `outputs/`.
