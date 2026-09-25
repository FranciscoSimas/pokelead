"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PokemonSprite } from "@/components/PokemonSprite";
import type { BoxPokemon } from "@/lib/types";
import { deleteSavedTeam, listSavedTeams, saveTeam, type SavedTeam } from "@/lib/teamsRemote";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function SavedTeamsPanel({
  formatLabel,
  leagueCp,
  cup,
  lead,
  switchMon,
  closer,
  onLoad,
  refreshToken = 0,
}: {
  formatLabel: string;
  leagueCp: number;
  cup: string;
  lead: BoxPokemon | null;
  switchMon: BoxPokemon | null;
  closer: BoxPokemon | null;
  onLoad: (team: SavedTeam) => void;
  refreshToken?: number;
}) {
  const { configured, user } = useAuth();
  const [rows, setRows] = useState<SavedTeam[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    void listSavedTeams({ leagueCp, cup }).then(setRows);
  }, [user, leagueCp, cup, refreshToken]);

  if (!configured) return null;

  const canSave = Boolean(user && lead && switchMon && closer);

  async function onSave() {
    if (!lead || !switchMon || !closer) return;
    setBusy(true);
    setError(null);
    const saved = await saveTeam({
      name: name.trim() || `${formatLabel} team`,
      leagueCp,
      cup,
      lead,
      switchMon,
      closer,
    });
    setBusy(false);
    if (!saved) {
      setError("Could not save team.");
      return;
    }
    setName("");
    setRows((prev) => [saved, ...prev]);
  }

  return (
    <section className="card space-y-3 rounded-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white">Saved teams</h2>
          <p className="text-sm text-muted">
            Saved for {formatLabel}. Save from the builder or any suggested team.
          </p>
        </div>
      </div>

      {!user ? (
        <p className="text-sm text-muted">
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to save teams across devices.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`${formatLabel} team`}
              className="field min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={!canSave || busy}
              onClick={() => void onSave()}
              className="btn btn-primary px-4 py-2.5"
            >
              Save current trio
            </button>
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {rows.length === 0 ? (
            <p className="text-sm text-faint">No saved teams yet.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-field border border-line bg-surface-2 p-2.5"
                >
                  <div className="flex -space-x-2">
                    {[t.lead, t.switchMon, t.closer].map((m) => (
                      <PokemonSprite
                        key={m.id}
                        speciesId={m.flags?.shadow ? `${m.speciesId}_shadow` : m.speciesId}
                        dex={m.dex}
                        alt={m.speciesName}
                        width={36}
                        height={36}
                        className="h-9 w-9"
                        shadow={m.flags?.shadow}
                      />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-faint">
                      {t.lead.speciesName} · {t.switchMon.speciesName} · {t.closer.speciesName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onLoad(t)}
                    className="btn btn-quiet min-h-11 px-3 py-2 text-sm"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(t.id)}
                    className="btn btn-quiet min-h-11 px-3 py-2 text-sm hover:bg-danger/10 hover:text-danger"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete saved team?"
        body="This cannot be undone."
        confirmLabel="Delete"
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          void deleteSavedTeam(deleteId);
          setRows((prev) => prev.filter((x) => x.id !== deleteId));
        }}
      />
    </section>
  );
}
