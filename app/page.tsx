const projectFields = [
  { label: "Назва застосунку", placeholder: "Наприклад: Rem" },
  {
    label: "Опис застосунку",
    placeholder: "Коротко: що робить застосунок і для кого він",
  },
  { label: "Цільова аудиторія", placeholder: "Хто має побачити ці Reels" },
  { label: "Маркетинговий кут", placeholder: "Емоція, біль або ситуація" },
  { label: "Default CTA", placeholder: "Наприклад: Завантажити застосунок" },
  { label: "Стиль контенту", placeholder: "UGC, діалог, гумор, storytelling" },
];

export default function ProjectPage() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[var(--accent-strong)]">
            Phase 1
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--foreground)]">
            Налаштування локального проєкту
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">
            Це стартовий Next.js shell. У наступному task форма почне зберігати
            дані у локальний JSON-файл, а зараз вона фіксує майбутню структуру
            MVP без AI-викликів і бази даних.
          </p>
        </div>

        <form className="mt-8 grid gap-5" aria-label="Налаштування проєкту">
          {projectFields.map((field) => (
            <label key={field.label} className="grid gap-2">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {field.label}
              </span>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-[var(--accent)] focus:ring-2 focus:ring-teal-100"
                placeholder={field.placeholder}
                type="text"
              />
            </label>
          ))}

          <button
            className="mt-2 w-fit rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white opacity-70"
            disabled
            type="button"
          >
            Збереження буде у task 02
          </button>
        </form>
      </section>

      <aside className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Поточний scope
        </h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
          <li>Next.js App Router працює у браузері на localhost.</li>
          <li>Сюжет у MVP вводиться вручну.</li>
          <li>AI, video provider і FFmpeg будуть додані окремими task-файлами.</li>
          <li>Дані будуть зберігатися локально у JSON.</li>
        </ul>
      </aside>
    </div>
  );
}

