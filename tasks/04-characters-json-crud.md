# 04. Characters JSON CRUD

## Goal

Додати створення та редагування recurring characters для AI Reels.

## Scope

Локальний CRUD через JSON-файли. Без advanced character management.

## Files likely changed

- `app/characters/page.tsx`
- `components/CharacterForm.tsx`
- `lib/types/character.ts`
- `lib/files/paths.ts`
- `lib/files/json.ts`
- `data/projects/default/characters/`
- `data/projects/default/references/`

## Character fields

- `name`
- `age`
- `description`
- `appearance`
- `personality`
- `clothes`
- `referenceImages`
- `voiceId`

## Steps

1. Створити тип `Character`.
2. Зберігати кожного персонажа окремим JSON-файлом.
3. Додати список персонажів.
4. Додати форму створення/редагування.
5. Reference images поки можна вводити як локальні paths або залишити поле для майбутнього upload.

## Acceptance criteria

- Можна створити персонажа.
- Можна відредагувати персонажа.
- Персонажі зберігаються у `data/projects/default/characters/`.
- UI українською.

