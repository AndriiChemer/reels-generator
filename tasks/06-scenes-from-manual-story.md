# 06. Manual scenes text, mentions and references

## Goal

Додати в Reel editor одне поле, куди користувач вручну вставляє всі описи сцен одним текстовим блоком.

## Scope

У цій задачі **не використовувати OpenAI** і не генерувати сюжет. Користувач сам пише сцени.

V1 має підтримувати простий ручний формат:

```text
Сцена 1:
@Sofia відкриває застосунок на телефоні. На екрані видно #screen-home.
Короткий динамічний кадр, 4 секунди.

Сцена 2:
@Sofia усміхається, поруч зʼявляється #logo як reference для бренду.
Кадр має виглядати як vertical UGC ad.
```

Правила:

- `@НазваПерсонажа` означає персонажа з локального списку characters.
- `#назва-референсу` означає додатковий asset/reference, наприклад `#logo`, `#screen-home`, `#screen-paywall`.
- Текст сцени залишається головним джерелом правди. Parser у V1 має бути простим і передбачуваним.
- Якщо mention або reference не знайдені, UI має показати warning, але не блокувати збереження.

## Files likely changed

- `app/reels/[reelId]/page.tsx`
- `components/SceneEditor.tsx`
- `app/actions/scenes.ts`
- `lib/scenes.ts`
- `lib/references.ts`
- `lib/types/reel.ts`
- `data/projects/default/reels/reel-id/scenes.json`

## Scene fields

`scenes.json` має зберігати original text і легку структуру:

- `sourceText`
- `scenes[].id`
- `scenes[].order`
- `scenes[].rawText`
- `scenes[].durationSeconds`
- `scenes[].videoPrompt`
- `scenes[].characterNames`
- `scenes[].characterIds`
- `scenes[].referenceNames`
- `scenes[].referencePaths`
- `scenes[].status`

У V1 `videoPrompt` може дорівнювати `rawText`. Окреме покращення prompts через AI буде пізніше.

## Parsing rules

- Розділяти сцени за заголовками `Сцена 1:`, `Scene 1:`, `1.` або за подвійним переносом рядка.
- Витягувати `@Name` як character mention.
- Витягувати `#asset-name` як reference mention.
- Для `@Name` робити case-insensitive match по `Character.name`.
- Для `#asset-name` поки достатньо зберігати назву як reference. File upload можна додати окремою задачею.

## Acceptance criteria

- Reel editor має одне велике поле для всіх сцен.
- Сцени зберігаються у `scenes.json` разом з `sourceText`.
- Після збереження editor показує parsed список сцен.
- `@Персонаж` звʼязується з персонажем, якщо такий існує.
- Unknown character mentions показуються як warning.
- `#reference` зберігається як reference mention.
- Unknown references показуються як warning, але не блокують flow.
- Можна вручну поправити scene text/prompt.
- OpenAI у цій задачі не викликається.

## Not in this task

- Генерація сюжету.
- AI split scenes.
- AI prompt improvement.
- Upload файлів.
- Автоматичне розпізнавання логотипів або screen assets.
