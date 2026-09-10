# AI Reels Local MVP

Локальний MVP для створення коротких AI Reels / TikToks / Shorts для промоції мобільного застосунку.

Цей проєкт має допомагати пройти простий шлях:

```text
сюжет від користувача -> сцени -> AI-відео -> превʼю -> регенерація -> фінальний MP4
```

Поточна фаза: **архітектура та документація**. Логіка застосунку, API-інтеграції та UI ще не реалізовані.

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
  -> OpenAI для scene prompts / video provider APIs
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

Після цієї фази наступний Codex-запит може бути:

```text
Read the project documentation and implement Phase 1 from IMPLEMENTATION_PLAN.md.
```

Першою технічною фазою має бути створення Next.js shell прямо у поточній папці репозиторію, базової структури папок, `.env.local.example` і локального project config без AI-інтеграцій.
