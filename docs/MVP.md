# MVP

## MVP

Перша версія має довести один повний локальний flow: від налаштувань проєкту до фінального вертикального MP4.

### 1. Project settings

Мінімальні поля:

- назва мобільного застосунку;
- опис застосунку;
- цільова аудиторія;
- маркетинговий кут;
- default CTA;
- стиль контенту.

Дані зберігаються у `data/projects/default/project.json`.

### 2. Characters

Мінімальний CRUD без складного менеджменту:

- name;
- age;
- description;
- appearance;
- personality;
- clothes;
- reference images.

Reference images зберігаються локально в папці проєкту.

### 3. Manual story input

Користувач сам вставляє:

- сюжет;
- рекламну ідею;
- чорновий сценарій;
- бажаний CTA;
- стиль відео.

Генерація сюжету з нуля не входить у перший MVP. Це буде додано пізніше.

Після збереження ручного сюжету застосунок створює Reel draft.

### 4. Reel editor

Редактор показує:

- концепт;
- ручний сюжет;
- CTA;
- список сцен.

Кожна сцена має:

- duration;
- dialogue;
- visual description;
- video prompt;
- character references;
- generation status;
- preview local video, якщо сцена вже згенерована.

Дії:

- generate scene;
- regenerate scene;
- generate all scenes;
- render final Reel.

### 5. Video generation

У V1 використовується тільки один video provider: **fal.ai**.

Кожне згенероване відео:

- завантажується з provider temporary URL;
- зберігається локально;
- привʼязується до scene metadata;
- відображається у preview через controlled media route.

### 6. Final render

FFmpeg створює фінальний MP4:

- 9:16;
- 1080x1920;
- H.264;
- сцени склеєні в правильному порядку.

## Later

Ці речі варто додавати тільки після робочого end-to-end flow:

- генерація ідей;
- генерація сюжету;
- генерація hooks;
- генерація повного сценарію;
- subtitles;
- CTA overlay;
- logo overlay;
- background music;
- sound effects;
- voice generation;
- image-to-video reference tuning;
- підтримка Google Veo;
- підтримка Kling, WAN, Seedance, Runway;
- кілька локальних проєктів;
- кращий cost dashboard;
- шаблони промптів;
- batch generation;
- history/versioning;
- export presets для TikTok, Reels, Shorts.

## Not Needed Now

Це свідомо не входить у MVP:

- база даних;
- Prisma або інший ORM;
- Redis;
- BullMQ;
- Docker;
- auth;
- cloud deployment;
- S3 або external storage;
- окремий backend;
- webhooks;
- складна domain architecture;
- Redux, Zustand або інший state manager;
- велика UI component library;
- billing;
- team accounts;
- production monitoring;
- автоматичне publish у соцмережі;
- повноцінна система тестів.

## Агресивне спрощення

Якщо фіча не допомагає отримати локальний `final.mp4`, вона не входить у V1.

Перший milestone успішний, коли можна:

1. заповнити project settings;
2. створити 1-2 персонажі;
3. вставити сюжет вручну;
4. отримати або вручну створити 3-5 сцен;
5. перевірити prompts для сцен;
6. згенерувати відео для кожної сцени;
7. переглянути сцени;
8. перегенерувати невдалу сцену;
9. склеїти фінальний вертикальний MP4.
