# 06. Scenes from manual story

## Goal

Створити 3-5 сцен із ручного сюжету.

## Scope

У цій задачі можна зробити або ручне додавання сцен, або OpenAI-assisted split, якщо ключ уже доступний. Сюжет з нуля не генерувати.

## Files likely changed

- `app/reels/[reelId]/page.tsx`
- `app/api/reels/scenes/from-story/route.ts`
- `components/SceneEditor.tsx`
- `lib/ai/openai.ts`
- `lib/ai/prompts/scenes.ts`
- `lib/types/reel.ts`
- `data/projects/default/reels/reel-id/scenes.json`

## Scene fields

- `id`
- `order`
- `durationSeconds`
- `dialogue`
- `visualDescription`
- `videoPrompt`
- `characterIds`
- `status`

## Acceptance criteria

- Reel editor показує список сцен.
- Сцени зберігаються у `scenes.json`.
- Можна вручну поправити scene text/prompt.
- Якщо використовується OpenAI, ключ читається тільки server-side.
- OpenAI не вигадує новий сюжет, а лише структурує введений текст.

