import { ProjectSettingsForm } from "@/components/ProjectSettingsForm";
import { readProjectSettings } from "@/lib/project-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ProjectPage() {
  const settings = await readProjectSettings();

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-normal text-[var(--foreground)]">
            Проєкт
          </h1>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">
            Дані про застосунок, для якого робимо рілси. Зберігаються локально
            у data/projects/default/project.json.
          </p>
        </div>

        <ProjectSettingsForm settings={settings} />
      </section>
    </div>
  );
}
