# 08. Generate scene video

## Goal

Додати запуск генерації відео для однієї сцени.

## Scope

Route handler приймає `reelId` і `sceneId`, викликає fal.ai provider і записує generation metadata.

## Files likely changed

- `app/api/reels/[reelId]/scenes/[sceneId]/generate/route.ts`
- `app/api/generations/[generationId]/route.ts`
- `app/reels/[reelId]/page.tsx`
- `components/SceneEditor.tsx`
- `lib/types/generation.ts`
- `data/projects/default/reels/reel-id/generations.json`

## Acceptance criteria

- У Reel editor є кнопка generate для сцени.
- Створюється generation metadata.
- Status може бути `queued`, `processing`, `completed` або `failed`.
- UI може poll-ити status.
- Помилки provider показуються зрозуміло.

