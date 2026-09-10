# 05. Manual story to Reel draft

## Goal

Додати сторінку, де користувач вручну вставляє сюжет і створює Reel draft.

## Scope

Генерації сюжету немає. Користувач сам вводить сюжет, CTA і стиль.

## Files likely changed

- `app/reels/new/page.tsx`
- `app/reels/[reelId]/page.tsx`
- `components/StoryForm.tsx`
- `lib/types/reel.ts`
- `lib/files/paths.ts`
- `lib/files/json.ts`
- `data/projects/default/reels/`

## Fields

- `title`
- `story`
- `cta`
- `style`

## Steps

1. Створити тип `ReelDraft`.
2. Додати форму `New Reel`.
3. На submit створювати папку `data/projects/default/reels/reel-id/`.
4. Записувати `reel.json`.
5. Перекидати користувача на `/reels/[reelId]`.

## Acceptance criteria

- Користувач вставляє сюжет вручну.
- Створюється `reel.json`.
- Reel editor показує title, story, CTA і style.
- Немає генерації ідей або сюжету.

