import Link from "next/link";
import { StoryForm } from "@/components/StoryForm";
import { listReelDrafts } from "@/lib/reels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewReelPage() {
  const reels = await listReelDrafts();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
        <p className="text-sm font-medium text-[var(--accent-strong)]">
          Крок 05
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Новий Reel
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Встав свій сюжет або чорновий сценарій. Зараз застосунок тільки
          зберігає чернетку Reel локально; генерація сюжету з нуля буде пізніше.
        </p>

        <div className="mt-8">
          <StoryForm />
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-base font-semibold">Чернетки</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Кожен Reel зберігається як reel.json у локальній папці
            data/projects/default/reels/.
          </p>
        </div>

        {reels.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Чернеток Reel ще немає. Створи першу з ручного сюжету.
            </p>
          </div>
        ) : (
          reels.map((reel) => (
            <Link
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 transition hover:border-[var(--accent)]"
              href={`/reels/${reel.id}`}
              key={reel.id}
            >
              <h3 className="text-base font-semibold">{reel.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">
                {reel.story}
              </p>
            </Link>
          ))
        )}
      </aside>
    </div>
  );
}
