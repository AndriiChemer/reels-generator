# 11. Cost metadata

## Goal

Додати базову видимість вартості генерацій без billing system.

## Scope

Зберігати estimated cost у generation metadata і показувати суму в Reel editor.

## Files likely changed

- `lib/types/generation.ts`
- `app/reels/[reelId]/page.tsx`
- `components/SceneEditor.tsx`
- `data/projects/default/reels/reel-id/generations.json`

## Metadata fields

- `provider`
- `model`
- `durationSeconds`
- `estimatedCostUsd`
- `createdAt`

## Acceptance criteria

- Кожна generation metadata може містити `estimatedCostUsd`.
- Reel editor показує суму по сценах.
- Якщо cost невідомий, UI не падає.
- Немає billing, accounts або payment logic.

