"use client";

import { useCallback, useState } from "react";

type ApiErrorPayload = { error?: string };

/**
 * Small helper for "click a button → POST to an API route" flows.
 * Keeps loading and error state so components stay short.
 */
export function usePostRequest<TResponse>() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const send = useCallback(
    async (url: string, body?: unknown): Promise<TResponse | null> => {
      setIsPending(true);
      setError("");

      try {
        return await postJson<TResponse>(url, body);
      } catch (requestError) {
        setError(readErrorMessage(requestError));
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [],
  );

  return { send, isPending, error, setError };
}

/** POSTs JSON and throws with the API error message on failure. */
export async function postJson<TResponse>(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json().catch(() => ({}))) as TResponse &
    ApiErrorPayload;

  if (!response.ok) {
    throw new Error(payload.error || `Запит не вдався (${response.status}).`);
  }

  return payload;
}

export function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Невідома помилка.";
}
