import Link from "next/link";
import { notFound } from "next/navigation";
import { SceneEditor } from "@/components/SceneEditor";
import { ScriptForm } from "@/components/ScriptForm";
import { listCharacters } from "@/lib/characters";
import { listClipAssets } from "@/lib/clips";
import { listGenerations } from "@/lib/generations";
import { listReferenceAssets } from "@/lib/references";
import { readReelDraft } from "@/lib/reels";
import { getReelDurationSeconds } from "@/lib/scene-status";
import { getSceneWarnings, readReelScenes } from "@/lib/scenes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ReelEditorPage({
  params,
}: {
  params: Promise<{ reelId: string }>;
}) {
  const { reelId } = await params;
  const [reel, scenesDocument, characters, referenceAssets, generations, clips] =
    await Promise.all([
      readReelDraft(reelId),
      readReelScenes(reelId),
      listCharacters(),
      listReferenceAssets(),
      listGenerations(reelId),
      listClipAssets(),
    ]);

  if (!reel) {
    notFound();
  }

  const scenes = scenesDocument?.scenes ?? [];
  const warnings = getSceneWarnings(scenesDocument, characters, referenceAssets);

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            className="text-sm font-medium text-[var(--accent-strong)]"
            href="/reels/new"
          >
            ← Усі рілси
          </Link>
          <h1 className="mt-2 text-3xl font-semibold">{reel.title}</h1>
          {reel.story ? (
            <p className="mt-2 max-w-3xl text-base leading-7 text-[var(--muted)]">
              {reel.story}
            </p>
          ) : null}
        </div>
        <p className="text-sm text-[var(--muted)]">
          {scenes.length} сцен · {getReelDurationSeconds(scenes)} с
        </p>
      </header>

      <details
        className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
        open={scenes.length === 0}
      >
        <summary className="cursor-pointer text-lg font-semibold">
          Сценарій і вигляд
        </summary>
        <div className="mt-5">
          <ScriptForm
            characters={characters}
            // Remount when the script changes on the server (e.g. a clip was added).
            key={scenesDocument?.updatedAt}
            reel={reel}
            sourceText={scenesDocument?.sourceText}
          />
        </div>
      </details>

      {scenes.length > 0 ? (
        <SceneEditor
          clipNames={clips.map((clip) => clip.name)}
          generations={generations}
          // Remount after the script is saved so the storyboard shows new scenes.
          key={scenesDocument?.updatedAt}
          reel={reel}
          scenes={scenes}
          warnings={warnings}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-[var(--border)] bg-white p-5 text-sm text-[var(--muted)]">
          Додай сцени у сценарій вище — тут зʼявиться розкадровка.
        </p>
      )}
    </div>
  );
}
