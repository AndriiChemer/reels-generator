# 09. Local video download and preview

## Goal

Завантажувати готові відео з provider temporary URL і показувати локальний preview.

## Scope

Не залежати від тимчасових URL provider. Усі готові MP4 зберігати локально.

## Files likely changed

- `app/api/generations/[generationId]/route.ts`
- `app/api/media/[...path]/route.ts`
- `components/VideoPreview.tsx`
- `lib/files/media.ts`
- `outputs/scenes/`

## Acceptance criteria

- MP4 завантажується у `outputs/scenes/reel-id/scene-id.mp4`.
- Scene metadata отримує `outputPath`.
- Preview використовує `/api/media/...`.
- Media route захищений від path traversal.
- Дозволені тільки очікувані media extensions.

