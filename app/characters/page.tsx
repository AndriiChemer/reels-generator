import { deleteCharacterAction } from "@/app/actions/characters";
import { CharacterForm } from "@/components/CharacterForm";
import { DeleteCharacterButton } from "@/components/DeleteCharacterButton";
import { listCharacters } from "@/lib/characters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CharactersPage() {
  const characters = await listCharacters();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="grid gap-5">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <p className="text-sm font-medium text-[var(--accent-strong)]">
            Крок 04
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Персонажі
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--muted)]">
            Створи повторюваних персонажів, яких пізніше можна буде привʼязати
            до сцен, референс-зображень і відео-провайдера.
          </p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-6">
          <h2 className="text-xl font-semibold">Новий персонаж</h2>
          <div className="mt-5">
            <CharacterForm />
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="text-base font-semibold">Збережені персонажі</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            JSON-файли лежать у data/projects/default/characters/.
          </p>
        </div>

        {characters.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Персонажів ще немає. Створи першого персонажа у формі зліва.
            </p>
          </div>
        ) : (
          characters.map((character) => (
            <article
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
              key={character.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{character.name}</h3>
                  {character.age ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Вік: {character.age}
                    </p>
                  ) : null}
                </div>
                <form action={deleteCharacterAction}>
                  <input name="characterId" type="hidden" value={character.id} />
                  <DeleteCharacterButton />
                </form>
              </div>

              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {character.description}
              </p>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-[var(--accent-strong)]">
                  Редагувати
                </summary>
                <div className="mt-4 border-t border-[var(--border)] pt-4">
                  <CharacterForm character={character} />
                </div>
              </details>
            </article>
          ))
        )}
      </aside>
    </div>
  );
}
