# Implementation Plan

## Phase 1. Project shell and local config

### Goal

Створити Next.js застосунок, базову структуру папок і локальний project config без AI-інтеграцій.

### Files likely changed

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `.env.local.example`
- `.gitignore`
- `data/projects/default/project.json`
- `lib/types/project.ts`
- `lib/files/paths.ts`
- `lib/files/json.ts`

### Acceptance criteria

- `npm run dev` запускає localhost.
- На головній сторінці видно просту форму project settings.
- Project settings можна зберегти у JSON.
- `.env.local.example` містить потрібні ключі.
- Немає AI API calls.
- Немає бази даних.

## Phase 2. Characters

### Goal

Додати створення та редагування локальних персонажів.

### Files likely changed

- `app/characters/page.tsx`
- `components/CharacterForm.tsx`
- `lib/types/character.ts`
- `lib/files/json.ts`
- `data/projects/default/characters/`
- `data/projects/default/references/`

### Acceptance criteria

- Можна створити персонажа.
- Можна відредагувати персонажа.
- Дані зберігаються як JSON.
- Reference image paths зберігаються локально.
- Advanced character management не реалізований.

## Phase 3. Manual scenes text, mentions and references

### Goal

Додати в Reel editor одне велике поле для ручного блоку сцен. Користувач сам вставляє описи сцен, використовує `@Персонаж` для персонажів і `#reference` для logo, screenshots та інших assets.

OpenAI у цій фазі не використовувати. Генерацію сюжету з нуля не реалізовувати.

### Files likely changed

- `app/reels/[reelId]/page.tsx`
- `components/SceneEditor.tsx`
- `app/actions/scenes.ts`
- `lib/scenes.ts`
- `lib/references.ts`
- `lib/types/reel.ts`

### Acceptance criteria

- Reel editor має textarea для всіх сцен одним блоком.
- `scenes.json` зберігає `sourceText` і parsed список сцен.
- Сцени можна розділяти через `Сцена 1:`, `Scene 1:`, `1.` або порожні рядки.
- `@Персонаж` case-insensitive звʼязується з локальним character.
- Unknown character mentions показуються як warnings.
- `#reference` зберігається як reference alias.
- Unknown references показуються як warnings, але не блокують flow.
- `videoPrompt` у V1 може дорівнювати `rawText`.
- Немає генерації ідей, сюжету або AI split scenes.

## Phase 4. Video provider integration

### Goal

Підключити один provider, fal.ai, для генерації scene video.

### Files likely changed

- `app/api/reels/[reelId]/scenes/[sceneId]/generate/route.ts`
- `app/api/generations/[generationId]/route.ts`
- `lib/ai/video-providers/types.ts`
- `lib/ai/video-providers/fal.ts`
- `lib/ai/video-providers/index.ts`
- `lib/types/generation.ts`

### Acceptance criteria

- Можна запустити генерацію однієї сцени.
- Metadata JSON отримує статус `queued` або `processing`.
- Можна poll-ити generation status.
- Provider-specific код ізольований у `lib/ai/video-providers/fal.ts`.
- Другий provider теоретично можна додати без зміни UI flow.

## Phase 5. Local video download and media preview

### Goal

Завантажувати готові provider videos локально й показувати scene preview.

### Files likely changed

- `app/api/generations/[generationId]/route.ts`
- `app/api/media/[...path]/route.ts`
- `components/VideoPreview.tsx`
- `lib/files/media.ts`
- `outputs/scenes/`

### Acceptance criteria

- Temporary provider URL не використовується як постійне джерело.
- MP4 зберігається у `outputs/scenes/reel-id/`.
- Scene metadata містить local output path.
- UI показує локальний preview через `/api/media/...`.
- Path traversal заблокований.

## Phase 6. Scene preview and regeneration

### Goal

Зробити простий Reel editor з generation status і можливістю перегенерувати погану сцену.

### Files likely changed

- `app/reels/[reelId]/page.tsx`
- `components/SceneEditor.tsx`
- `components/VideoPreview.tsx`
- `lib/types/reel.ts`
- `lib/types/generation.ts`

### Acceptance criteria

- Reel editor показує всі сцени.
- Кожна сцена має status.
- Completed scene має preview.
- Failed scene показує error.
- Regenerate scene створює нову generation metadata і оновлює output path після завершення.
- Можна вручну запустити generate all scenes без черг.

## Phase 7. FFmpeg final Reel generation

### Goal

Склеїти готові scenes у фінальний вертикальний MP4.

### Files likely changed

- `app/api/reels/[reelId]/render/route.ts`
- `lib/ffmpeg/assertFfmpegAvailable.ts`
- `lib/ffmpeg/renderReel.ts`
- `lib/types/reel.ts`
- `outputs/reels/`

### Acceptance criteria

- App перевіряє, що FFmpeg доступний.
- Усі scene clips нормалізуються до 1080x1920, H.264 MP4.
- Clips склеюються у правильному порядку.
- `final.mp4` зберігається у `outputs/reels/reel-id/final.mp4`.
- UI показує preview або link на final MP4.
- Якщо FFmpeg падає, користувач бачить зрозумілу помилку.

## Phase 8. Basic UX cleanup

### Goal

Зробити локальний MVP зручним для повторного використання без розширення scope.

### Files likely changed

- `app/page.tsx`
- `app/characters/page.tsx`
- `app/reels/new/page.tsx`
- `app/reels/[reelId]/page.tsx`
- `components/*`

### Acceptance criteria

- Є проста навігація між Project, Characters, New Reel і Reel editor.
- Loading і error states зрозумілі.
- Buttons disabled під час активної операції.
- Cost estimate видно в Reel editor, якщо metadata має `estimatedCostUsd`.
- Немає нових великих dependencies.

## Recommended first next step

У наступній Codex-сесії треба почати з:

```text
Read the project documentation and implement Phase 1 from IMPLEMENTATION_PLAN.md.
```

Phase 1 навмисно мала: вона створює основу, але не відкриває одразу AI/API/FFmpeg складність.
