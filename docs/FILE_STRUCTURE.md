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

  data/
    projects/
      default/
        project.json
        characters/
          character-john.json
          character-sofia.json
        references/
          characters/
            character-john/
              reference-01.png
          app/
            logo.png
            screen-home.png
        reels/
          reel-001/
            reel.json
            scenes.json
            generations.json

  outputs/
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

### `data/projects/default/references/`

Локальні reference assets, які можна передавати в сцени.

Рекомендована структура:

- `references/characters/character-id/` для фото або зображень персонажа;
- `references/app/` для logo, screenshots і branding assets застосунку;
- `references/reels/reel-id/`, якщо пізніше потрібні assets тільки для конкретного Reel.

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
      "characterNames": ["Sofia"],
      "characterIds": ["character-sofia"],
      "referenceNames": ["screen-home"],
      "referencePaths": ["references/app/screen-home.png"],
      "status": "draft"
    }
  ]
}
```

## Outputs

### `outputs/scenes/`

Локальні MP4 для окремих сцен.

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
