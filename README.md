# AI Reels Local MVP

Локальний MVP для створення коротких AI Reels / TikToks / Shorts для промоції мобільного застосунку.

Цей проєкт має допомагати пройти простий шлях:

```text
сюжет від користувача -> ручний блок сцен -> AI-відео -> вибіркові SFX + фонова музика -> фінальний MP4 зі звуком
```

Поточна фаза: **локальний video flow, вибіркові SFX, фонова музика і фінальний audio mix**. Проєкт уже створюється прямо в цій папці без вкладеної project-папки.

## Обраний стек

- Next.js з App Router
- TypeScript
- React
- Tailwind CSS через стандартний шаблон Next.js
- Next.js Route Handlers і Server Actions для серверної логіки
- Локальна файлова система замість бази даних
- FFmpeg як локальний інструмент для фінального рендерингу відео
- npm як пакетний менеджер

## Основна ідея архітектури

Застосунок працює тільки на `localhost`. Браузер спілкується з Next.js UI, а всі AI-виклики, робота з файлами, завантаження відео та запуск FFmpeg виконуються лише на серверному боці Next.js.

```text
Browser
  -> Next.js UI
  -> Next.js server routes / server actions
  -> video provider APIs
  -> later OpenAI для structured prompts
  -> local filesystem
  -> FFmpeg
  -> local MP4
```

API-ключі не потрапляють у браузер. Дані зберігаються у локальних JSON-файлах і папках з медіафайлами.

## Документація

- [Архітектура](docs/ARCHITECTURE.md)
- [MVP scope](docs/MVP.md)
- [Встановлення та запуск](docs/SETUP.md)
- [Структура файлів](docs/FILE_STRUCTURE.md)
- [AI-провайдери](docs/AI_PROVIDERS.md)
- [План реалізації](docs/IMPLEMENTATION_PLAN.md)

## Що буде реалізовано пізніше

Наступний важливий крок: додати TTS для діалогів персонажів і керування гучністю окремих аудіошарів.
