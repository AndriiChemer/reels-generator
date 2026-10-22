import Link from "next/link";
import { StoryForm } from "@/components/StoryForm";
import { listCharacters } from "@/lib/characters";
import { listReelDrafts } from "@/lib/reels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewReelPage() {
  const [reels, characters] = await Promise.all([
    listReelDrafts(),
    listCharacters(),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
        <h1 className="text-3xl font-semibold">Новий рілс</h1>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Опиши вигляд один раз і розпиши сцени. Далі — розкадровка: кадри,
          відео, звук і фінальний MP4.
        </p>

        <div className="mt-6">
          <StoryForm characters={characters} />
        </div>
      </section>

      <aside className="grid content-start gap-3">
        <h2 className="text-base font-semibold">Мої рілси</h2>

        {reels.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">
            Поки порожньо.
          </p>
        ) : (
          reels.map((reel) => (
            <Link
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]"
              href={`/reels/${reel.id}`}
              key={reel.id}
            >
              <h3 className="font-semibold">{reel.title}</h3>
              {reel.story ? (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                  {reel.story}
                </p>
              ) : null}
            </Link>
          ))
        )}
      </aside>
    </div>
  );
}
