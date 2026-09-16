export default function Loading() {
  return (
    <div
      aria-live="polite"
      className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6"
    >
      <p className="text-sm font-medium text-[var(--accent-strong)]">
        Завантаження...
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        Читаю локальні JSON-файли проєкту.
      </p>
    </div>
  );
}
