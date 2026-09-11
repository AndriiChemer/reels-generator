export default function NewReelPage() {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
      <p className="text-sm font-medium text-[var(--accent-strong)]">Task 05</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal">
        Новий Reel
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
        У першому MVP сюжет вставляється вручну. Форма створення Reel draft
        зʼявиться в окремому task, без генерації сюжету з нуля.
      </p>
    </section>
  );
}
