import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
      <p className="text-sm font-medium text-[var(--accent-strong)]">
        Не знайдено
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-normal">
        Такої сторінки або чернетки немає
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Перевір адресу або повернись до створення нового Reel.
      </p>
      <Link
        className="mt-5 inline-flex w-full justify-center rounded-md border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)] sm:w-fit"
        href="/reels/new"
      >
        До чернеток Reel
      </Link>
    </div>
  );
}
