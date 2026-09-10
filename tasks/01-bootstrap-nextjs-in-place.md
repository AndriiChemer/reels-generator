# 01. Bootstrap Next.js у поточній папці

## Goal

Ініціалізувати Next.js-проєкт без створення вкладеної папки. Проєкт має жити прямо в поточному репозиторії.

## Scope

Створити мінімальну основу Next.js App Router з TypeScript, Tailwind і npm.

## Files likely changed

- `package.json`
- `package-lock.json`
- `app/layout.tsx`
- `app/page.tsx`
- `app/globals.css`
- `next.config.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `.gitignore`
- `.env.local.example`

## Steps

1. Перевірити, чи вже існує `package.json`.
2. Якщо немає, виконати `npm init -y`.
3. Встановити базові залежності Next.js.
4. Додати scripts: `dev`, `build`, `start`, `lint`. Для поточного MVP використовувати `next dev --webpack` і `next build --webpack`, якщо Turbopack падає у локальному середовищі.
5. Створити мінімальні `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
6. Створити `.env.local.example`.
7. Переконатися, що `npm run dev` стартує.

## Acceptance criteria

- `npm run dev` запускає `http://localhost:3000`.
- Головна сторінка відкривається в браузері.
- Немає вкладеної папки проєкту.
- Немає AI-інтеграцій.
- Немає бази даних.
