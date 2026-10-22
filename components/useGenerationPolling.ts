"use client";

import { useEffect } from "react";
import type { GenerationMetadata } from "@/lib/types/generation";

/** Kling takes minutes, so checking every 5 seconds is plenty. */
const POLL_INTERVAL_MS = 5000;

/** Polls the provider status of a running video generation. */
export function useGenerationPolling(
  generation: GenerationMetadata | undefined,
  onUpdate: (generation: GenerationMetadata) => void,
) {
  const generationId = generation?.id;
  const isActive =
    generation?.status === "queued" ||
    generation?.status === "processing" ||
    generation?.errorMessage === "fal.ai request failed with 405.";

  useEffect(() => {
    if (!generationId || !isActive) {
      return;
    }

    let isRequestInFlight = false;

    const intervalId = window.setInterval(async () => {
      if (isRequestInFlight) {
        return;
      }

      isRequestInFlight = true;

      try {
        const response = await fetch(`/api/generations/${generationId}`);
        const payload = (await response.json()) as {
          generation?: GenerationMetadata;
        };

        if (payload.generation) {
          onUpdate(payload.generation);
        }
      } catch {
        // Network hiccup: try again on the next tick.
      } finally {
        isRequestInFlight = false;
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [generationId, isActive, onUpdate]);
}
