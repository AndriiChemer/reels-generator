"use client";

import { useFormStatus } from "react-dom";

export function DeleteCharacterButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? "Видалення..." : "Видалити"}
    </button>
  );
}
