import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { readProjectSettings } from "@/lib/project-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProjectPage() {
  const settings = await readProjectSettings();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-[var(--accent-strong)]">
            Task 02
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal text-[var(--foreground)]">
            Налаштування локального проєкту
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">
            Заповни базові дані про мобільний застосунок. Вони зберігаються
            тільки локально у JSON-файл і будуть використані наступними кроками
            для персонажів, сцен і відео.
          </p>
        </div>

        <ProjectSettingsForm settings={settings} />
      </section>

      <aside className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="text-base font-semibold text-[var(--foreground)]">
          Локальне збереження
        </h2>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-[var(--muted)]">
          <li>Файл: `data/projects/default/project.json`.</li>
          <li>API-ключі не використовуються у цьому task.</li>
          <li>База даних, ORM і cloud storage не додаються.</li>
          <li>Після refresh сторінка читає актуальні значення з JSON.</li>
        </ul>
      </aside>
    </div>
  );
}
