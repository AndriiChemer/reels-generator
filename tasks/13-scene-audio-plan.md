# 13. Scene audio plan

## Goal
Додати перший шар автоматичного audio pipeline: структурований audio plan для кожної сцени.

## Scope
- Парсити явний блок `Звук:` у тексті сцени.
- Якщо блоку `Звук:` немає, створювати базовий auto audio prompt з опису сцени.
- Зберігати audio plan у `scenes.json`.
- Показувати audio plan у Reel editor.
- Не генерувати аудіо і не змінювати FFmpeg render у цьому task.

## Files likely changed
- `lib/types/reel.ts`
- `lib/scenes.ts`
- `components/SceneEditor.tsx`
- `docs/FILE_STRUCTURE.md`

## Acceptance criteria
- Кожна новозбережена сцена має `audioPlan`.
- `Звук:` не потрапляє у `videoPrompt`.
- UI показує, чи audio plan ручний або автоматичний.
- Audio plan містить prompt для майбутнього audio provider.
- Немає нових залежностей.
- `make lint` і `make build` проходять.
