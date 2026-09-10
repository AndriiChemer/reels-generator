# 03. Простий layout і навігація

## Goal

Додати базову навігацію між головними секціями локального MVP.

## Scope

Без складної дизайн-системи. Мінімальний responsive layout.

## Files likely changed

- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `app/characters/page.tsx`
- `app/reels/new/page.tsx`

## Navigation items

- `Project`
- `Characters`
- `New Reel`

`Reel Editor` може зʼявлятися через конкретний URL `/reels/[reelId]` після створення Reel.

## Acceptance criteria

- Є видима навігація.
- Сторінки відкриваються без помилок.
- Layout не потребує UI-бібліотеки.
- Тексти UI українською мовою.

