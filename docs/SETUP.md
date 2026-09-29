# Встановлення та запуск

## Рекомендовані рішення

- Node.js: **24 LTS**
- Package manager: **npm**
- Framework: **Next.js App Router**
- Styling: **Tailwind CSS зі стандартного шаблону Next.js**
- Video processing: **локально встановлений FFmpeg**

Node.js 24 LTS обрано як актуальну LTS-гілку станом на 2026-09-10. Next.js вимагає Node.js 20.9 або новіше, тож Node.js 24 дає запас і стабільну підтримку.

npm обрано тому, що він встановлюється разом із Node.js і не потребує додаткових інструментів.

## Required software

Потрібно встановити:

- Git;
- Node.js 24 LTS;
- npm, який встановлюється разом із Node.js;
- FFmpeg;
- редактор коду, наприклад VS Code.

## Встановлення Node.js

### macOS

Найпростіший варіант через `nvm`:

```bash
brew install nvm
nvm install 24
nvm use 24
node -v
npm -v
```

Якщо `nvm` уже встановлений:

```bash
nvm install 24
nvm use 24
```

### Windows

Рекомендовано встановити Node.js 24 LTS з офіційного сайту:

```text
https://nodejs.org/
```

Після встановлення перевірити у PowerShell:

```powershell
node -v
npm -v
```

Альтернатива для розробки: WSL2 + Ubuntu + Node через `nvm`.

### Linux

Рекомендовано `nvm`:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
nvm install 24
nvm use 24
node -v
npm -v
```

## Встановлення FFmpeg

FFmpeg потрібен для склеювання сцен, нормалізації формату та експорту фінального vertical MP4.

### macOS

```bash
brew install ffmpeg
ffmpeg -version
```

### Windows

Найпростіші варіанти:

```powershell
winget install Gyan.FFmpeg
ffmpeg -version
```

Або встановити FFmpeg вручну з:

```text
https://ffmpeg.org/download.html
```

Після ручного встановлення треба додати `ffmpeg/bin` до `PATH`.

### Linux

Ubuntu / Debian:

```bash
sudo apt update
sudo apt install ffmpeg
ffmpeg -version
```

Fedora:

```bash
sudo dnf install ffmpeg
ffmpeg -version
```

## Як Next.js буде викликати FFmpeg

Node.js route handler запускатиме `ffmpeg` через `child_process.spawn`.

Важливі правила:

- не використовувати shell string concatenation;
- передавати аргументи як масив;
- працювати тільки з локальними файлами всередині `outputs/`;
- перевіряти наявність `ffmpeg` перед render flow;
- зберігати stdout/stderr у metadata або логах для debug.

Перевірка доступності:

```bash
ffmpeg -version
```

У застосунку можна зробити server-side helper `assertFfmpegAvailable()`, який запускає `ffmpeg -version` і повертає зрозумілу помилку, якщо інструмент не встановлений.

## API accounts / keys

### Required for MVP

Потрібні:

- fal.ai API key для першої video generation інтеграції.
- ElevenLabs API key для автоматичної генерації scene sound effects / ambience.

### Optional later

Можна додати пізніше:

- OpenAI API key для AI-assisted split scenes і prompt improvement;
- генерацію ідей, hooks і сюжетів через OpenAI;
- Google API key для Veo;
- ключі Kling, WAN, Seedance, Runway або інших video providers;
- voice generation provider для діалогів і озвучки.

## Environment variables

Файл:

```text
.env.local
```

Приклад:

```bash
OPENAI_API_KEY=
FAL_KEY=
FAL_VIDEO_MODEL=fal-ai/fast-svd/text-to-video
FAL_ESTIMATED_COST_PER_SECOND_USD=
GOOGLE_API_KEY=
VIDEO_PROVIDER=fal
AUDIO_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=
ELEVENLABS_SOUND_EFFECTS_MODEL=eleven_text_to_sound_v2
ELEVENLABS_OUTPUT_FORMAT=mp3_44100_128
ELEVENLABS_PROMPT_INFLUENCE=0.45
ELEVENLABS_MUSIC_MODEL=music_v2_5
ELEVENLABS_MUSIC_OUTPUT_FORMAT=mp3_44100_128
```

`GOOGLE_API_KEY` можна залишити порожнім у V1.

`FAL_ESTIMATED_COST_PER_SECOND_USD` можна залишити порожнім. Якщо хочеш бачити
локальну оцінку витрат, вкажи приблизну ціну однієї секунди генерації у USD.

`ELEVENLABS_API_KEY` потрібен для автоматичної генерації звуків. Без нього можна
зберігати audio plan, але не можна згенерувати MP3 для сцени з ручним блоком
`Звук:` і конкретними SFX.

`ELEVENLABS_OUTPUT_FORMAT` у V1 варто залишити `mp3_44100_128`, бо далі FFmpeg
легко зміксує MP3 у фінальний MP4 з AAC audio.

Щоб створювати фонову музику, відкрий налаштування API key в ElevenLabs і надай
йому `Music Generation: Access`. Для SFX потрібен окремий дозвіл `Sound Effects:
Access`. Обидва дозволи використовують один `ELEVENLABS_API_KEY`.

Правила:

- не комітити `.env.local`;
- не читати API keys у client components;
- усі AI-виклики робити тільки server-side;
- для client-side можна показувати тільки provider name, model і estimated cost, але не ключі.

## Project bootstrap

Проєкт має жити **безпосередньо у поточній папці репозиторію**, без вкладеної папки на кшталт `ai-reels-local/`.

Поточна папка вже містить документацію, тому найкращий шлях для Phase 1: ініціалізувати Next.js in-place і не запускати `create-next-app` у вкладену директорію.

Перейти в репозиторій:

```bash
cd "/Users/achemer/StudioProjects/reels generator"
```

Якщо `package.json` ще немає, створити його:

```bash
npm init -y
```

Встановити мінімальні runtime dependencies:

```bash
npm install next@latest react@latest react-dom@latest
```

Встановити dev dependencies:

```bash
npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next tailwindcss @tailwindcss/postcss postcss
```

Додати scripts у `package.json` під час Phase 1:

```json
{
  "scripts": {
    "dev": "next dev --webpack",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint"
  }
}
```

У поточному локальному середовищі `next build` через Turbopack падав на внутрішній помилці привʼязки до порту під час PostCSS/Tailwind обробки. Для стабільного MVP використовується webpack-режим, який успішно проходить build і не змінює архітектуру застосунку.

Після того як Phase 1 створить `app/layout.tsx`, `app/page.tsx`, `next.config.ts`, `tsconfig.json` і Tailwind/PostCSS config, запуск буде:

```bash
npm run dev
```

У браузері:

```text
http://localhost:3000
```

Якщо `3000` зайнятий, Next.js запропонує інший порт або можна явно запустити:

```bash
npm run dev -- -p 3001
```

## Початкові залежності

На старті не треба додавати зайві пакети.

Після bootstrap достатньо залежностей:

- `next`;
- `react`;
- `react-dom`;
- `typescript`;
- `eslint`;
- `tailwindcss` та конфігурація шаблону.

Пізніше, під час відповідних фаз, можна додати:

```bash
npm install openai
npm install @fal-ai/client
```

Якщо для JSON validation буде потрібна мінімальна перевірка, можна обійтися ручними type guards. `zod` не потрібен у першій фазі.

## Підготовка перед implementation

Перед наступною Codex-сесією користувачу потрібно:

1. Встановити Node.js 24 LTS.
2. Переконатися, що `node -v` показує `v24.x`.
3. Переконатися, що `npm -v` працює.
4. Встановити FFmpeg.
5. Переконатися, що `ffmpeg -version` працює.
6. Створити fal.ai API key.
7. Бути готовим додати fal.ai key у `.env.local`, коли дійдемо до video generation task.
8. OpenAI API key створити пізніше, коли додаватимемо AI-assisted scenes або генерацію сюжету.
