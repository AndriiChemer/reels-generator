# 14. Audio provider abstraction

## Goal
Підготувати server-side abstraction для автоматичної генерації звуків/SFX зі scene `audioPlan`.

## Scope
- Додати спільний `AudioProvider` interface.
- Додати перший provider: ElevenLabs Sound Effects.
- Додати env-змінні для audio provider.
- Не додавати UI, route handlers, storage або FFmpeg mixing у цьому task.

## Files likely changed
- `.env.local.example`
- `lib/types/audio-generation.ts`
- `lib/ai/audio-providers/types.ts`
- `lib/ai/audio-providers/index.ts`
- `lib/ai/audio-providers/elevenlabs.ts`
- `docs/AI_PROVIDERS.md`
- `docs/SETUP.md`

## Acceptance criteria
- Audio provider не імпортується у client components.
- API key читається тільки server-side.
- Provider повертає audio bytes, MIME type, extension і metadata.
- Є зрозумілі помилки для відсутнього key, поганого duration або HTTP-помилки.
- Немає нових npm dependencies.
- `make lint` і `make build` проходять.
