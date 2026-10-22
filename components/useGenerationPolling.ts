"use client";

import { useEffect } from "react";
import type { GenerationMetadata } from "@/lib/types/generation";

/** Kling never finishes in under a minute, so the first check waits. */
const FIRST_CHECK_AFTER_MS = 60_000;
/** After that, checking every 15 seconds is plenty for a multi-minute job. */
const POLL_INTERVAL_MS = 15_000;

/** Polls the provider status of a running video generation. */
export function useGenerationPolling(
  generation: GenerationMetadata | undefined,
  onUpdate: (generation: GenerationMetadata) => void,
) {
  const generationId = generation?.id;
  const createdAt = generation?.createdAt;
  const isActive =
    generation?.status === "queued" ||
    generation?.status === "processing" ||
    generation?.errorMessage === "fal.ai request failed with 405.";

  useEffect(() => {
    if (!generationId || !createdAt || !isActive) {
      return;
    }

    let timeoutId: number | undefined;
    let isCancelled = false;

    async function check() {
      try {
        const response = await fetch(`/api/generations/${generationId}`);
        const payload = (await response.json()) as {
          generation?: GenerationMetadata;
        };

        if (payload.generation && !isCancelled) {
          onUpdate(payload.generation);
        }
      } catch {
        // Network hiccup: try again on the next tick.
      }

      if (!isCancelled) {
        timeoutId = window.setTimeout(check, POLL_INTERVAL_MS);
      }
    }

    const ageMs = Date.now() - Date.parse(createdAt);
    timeoutId = window.setTimeout(check, Math.max(FIRST_CHECK_AFTER_MS - ageMs, 0));

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [generationId, createdAt, isActive, onUpdate]);
}
