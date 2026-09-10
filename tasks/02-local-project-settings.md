# 02. Local project settings

## Goal

Додати локальні налаштування мобільного застосунку, які зберігаються у JSON.

## Scope

Одна проста форма на головній сторінці. Дані зберігаються у `data/projects/default/project.json`.

## Files likely changed

- `app/page.tsx`
- `lib/types/project.ts`
- `lib/files/paths.ts`
- `lib/files/json.ts`
- `data/projects/default/project.json`

## Fields

- `appName`
- `appDescription`
- `targetAudience`
- `marketingAngle`
- `defaultCta`
- `contentStyle`

## Steps

1. Створити тип `ProjectSettings`.
2. Створити helper-и для читання/запису JSON.
3. Створити безпечні path constants для `data/`.
4. Показати форму project settings.
5. Зберігати форму через Server Action або простий server-side handler.

## Acceptance criteria

- Користувач може заповнити форму.
- Дані записуються у `data/projects/default/project.json`.
- Після refresh сторінки значення підтягуються з JSON.
- Немає API calls до OpenAI/fal.ai.

