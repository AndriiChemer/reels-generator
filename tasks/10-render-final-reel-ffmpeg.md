# 10. Render final Reel with FFmpeg

## Goal

Склеїти готові scene clips у фінальний vertical MP4.

## Scope

Використати локально встановлений `ffmpeg` через Node `child_process.spawn`.

## Files likely changed

- `app/api/reels/[reelId]/render/route.ts`
- `app/reels/[reelId]/page.tsx`
- `lib/ffmpeg/assertFfmpegAvailable.ts`
- `lib/ffmpeg/renderReel.ts`
- `outputs/reels/`

## Output format

- 1080x1920
- 9:16
- H.264 MP4
- `outputs/reels/reel-id/final.mp4`

## Acceptance criteria

- App перевіряє доступність FFmpeg.
- Completed scenes склеюються у правильному порядку.
- Final MP4 зберігається локально.
- UI показує preview або link на final MP4.
- FFmpeg errors показуються зрозуміло.

