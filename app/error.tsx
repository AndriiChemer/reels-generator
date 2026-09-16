"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900">
      <p className="text-sm font-medium">Щось пішло не так</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-normal">
        Не вдалося відкрити цей екран
      </h1>
      <p className="mt-3 break-words text-sm leading-6">
        {error.message || "Спробуй повторити дію або перевір локальні файли."}
      </p>
      <button
        className="mt-5 w-full rounded-md bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800 sm:w-fit"
        onClick={reset}
        type="button"
      >
        Спробувати ще раз
      </button>
    </div>
  );
}
