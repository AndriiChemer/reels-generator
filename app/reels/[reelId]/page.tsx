import Link from "next/link";
import { notFound } from "next/navigation";
import { readReelDraft } from "@/lib/reels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReelEditorPage({
  params,
}: {
  params: Promise<{ reelId: string }>;
}) {
  const { reelId } = await params;
  const reel = await readReelDraft(reelId);

  if (!reel) {
    notFound();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
        <p className="text-sm font-medium text-[var(--accent-strong)]">
          Reel Editor
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          {reel.title}
        </h1>

        <div className="mt-6 grid gap-5">
          <section>
            <h2 className="text-base font-semibold">Сюжет</h2>
            <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-[var(--muted)]">
              {reel.story}
            </p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-md border border-[var(--border)] p-4">
              <h2 className="text-sm font-semibold">CTA</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {reel.cta || "CTA ще не задано."}
              </p>
            </section>

            <section className="rounded-md border border-[var(--border)] p-4">
              <h2 className="text-sm font-semibold">Стиль</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {reel.style || "Стиль ще не задано."}
              </p>
            </section>
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-base font-semibold">Наступний крок</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            У task 06 цей сюжет буде розкладатися на 3-5 сцен. Генерації
            сюжету з нуля тут немає.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-base font-semibold">Локальні дані</h2>
          <dl className="mt-3 grid gap-3 text-sm text-[var(--muted)]">
            <div>
              <dt className="font-medium text-[var(--foreground)]">ID</dt>
              <dd className="mt-1 break-all">{reel.id}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--foreground)]">Оновлено</dt>
              <dd className="mt-1">{formatDate(reel.updatedAt)}</dd>
            </div>
          </dl>
        </div>

        <Link
          className="rounded-md border border-[var(--border)] bg-white px-4 py-3 text-center text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
          href="/reels/new"
        >
          Створити ще один Reel
        </Link>
      </aside>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return "Немає дати";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

