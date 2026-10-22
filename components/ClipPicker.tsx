"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorText, SmallButton } from "@/components/ui";

/**
 * Puts a ready-made video into a scene: either a clip from the library
 * (references/clips) or a new upload that is saved there for reuse.
 */
export function ClipPicker({
  clipNames,
  defaultName,
  sceneUrl,
}: {
  clipNames: string[];
  defaultName?: string;
  sceneUrl: string;
}) {
  const router = useRouter();
  const [selectedClip, setSelectedClip] = useState(defaultName ?? clipNames[0] ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [newName, setNewName] = useState(defaultName ?? "endcard");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setIsPending(true);
    setError("");

    try {
      const response = await fetch(`${sceneUrl}/clip`, { method: "POST", body: formData });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error || "Не вдалося додати відео.");
        return;
      }

      router.refresh();
    } catch {
      setError("Не вдалося надіслати файл.");
    } finally {
      setIsPending(false);
    }
  }

  function useLibraryClip() {
    const formData = new FormData();
    formData.set("name", selectedClip);
    void submit(formData);
  }

  function uploadClip() {
    if (!file) {
      setError("Обери відеофайл.");
      return;
    }

    const formData = new FormData();
    formData.set("name", newName);
    formData.set("file", file);
    void submit(formData);
  }

  return (
    <div className="grid gap-3 rounded-md bg-slate-50 p-3 text-xs">
      {clipNames.length > 0 ? (
        <div className="grid gap-1.5">
          <span className="font-medium">З бібліотеки</span>
          <div className="flex gap-2">
            <select
              className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
              onChange={(event) => setSelectedClip(event.target.value)}
              value={selectedClip}
            >
              {clipNames.map((name) => (
                <option key={name} value={name}>
                  #{name}
                </option>
              ))}
            </select>
            <SmallButton disabled={isPending || !selectedClip} onClick={useLibraryClip}>
              Використати
            </SmallButton>
          </div>
        </div>
      ) : null}

      <div className="grid gap-1.5">
        <span className="font-medium">Завантажити нове</span>
        <input
          accept="video/mp4,video/quicktime,video/webm,.m4v"
          className="text-xs"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          type="file"
        />
        <div className="flex gap-2">
          <input
            aria-label="Назва в бібліотеці"
            className="min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2 py-1.5"
            onChange={(event) => setNewName(event.target.value)}
            placeholder="endcard"
            value={newName}
          />
          <SmallButton disabled={isPending} onClick={uploadClip}>
            {isPending ? "Завантаження…" : "Завантажити"}
          </SmallButton>
        </div>
        <span className="text-[var(--muted)]">
          Збережеться в references/clips/ — у будь-якому рілсі пиши «Відео: #
          {newName || "назва"}».
        </span>
      </div>

      <ErrorText message={error} />
    </div>
  );
}
