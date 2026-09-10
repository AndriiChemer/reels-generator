# 07. Video provider abstraction

## Goal

Підготувати мінімальну абстракцію для video generation provider.

## Scope

Один provider у V1: `fal.ai`. Абстракція має бути тонкою, без factories, DI frameworks і зайвих domain layers.

## Files likely changed

- `lib/ai/video-providers/types.ts`
- `lib/ai/video-providers/fal.ts`
- `lib/ai/video-providers/index.ts`
- `lib/types/generation.ts`
- `.env.local.example`

## Types

- `VideoGenerationInput`
- `VideoGenerationResult`
- `VideoProvider`
- `GenerationMetadata`

## Acceptance criteria

- Є один provider implementation для fal.ai.
- Provider code ізольований від UI.
- `FAL_KEY` читається тільки server-side.
- Другий provider можна додати пізніше без переписування Reel editor.

