import { useBoxStore } from "@/store/box";
import type { BoxPokemon } from "@/lib/types";
import {
  ensureProfile,
  fetchRemoteBox,
  markBoxMigrated,
  syncDeletePokemon,
  syncUpsertMany,
  syncUpsertPokemon,
} from "@/lib/boxSync";

function waitForPersist(): Promise<void> {
  const api = useBoxStore.persist;
  if (api.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = api.onFinishHydration(() => {
      unsub();
      resolve();
    });
  });
}

let hydrateInFlight: Promise<void> | null = null;
let flushInFlight: Promise<void> | null = null;

/** Drop cloud box from the UI when signing out so the next account cannot see it. */
export function clearLocalBoxForGuest(): void {
  useBoxStore.setState({ pokemon: [], pendingDeletes: [], dirtyIds: [] });
}

/**
 * Combat identity for guest↔cloud dedupe.
 * Same species + shadow + CP + IVs + moves = same mon (even with different UUIDs).
 */
export function boxPokemonFingerprint(p: BoxPokemon): string {
  const charged = [...(p.chargedMoves ?? [])]
    .map((m) => m.toUpperCase())
    .filter(Boolean)
    .sort()
    .join("+");
  const fast = (p.fastMove ?? "").toUpperCase();
  return [
    p.speciesId.replace(/_shadow$/i, "").toLowerCase(),
    p.flags.shadow ? "1" : "0",
    String(p.cp),
    String(p.atkIv),
    String(p.defIv),
    String(p.hpIv),
    fast,
    charged,
  ].join("|");
}

/**
 * Union of cloud + guest:
 * - keep every cloud mon
 * - keep guest mons that are new (not same id, not same fingerprint)
 * - skip guest copies that match an existing cloud mon (avoid Blastoise duplicates)
 * - same id → newer updatedAt wins (and may need re-upload)
 */
export function mergeGuestWithCloud(
  local: BoxPokemon[],
  remote: BoxPokemon[],
): { merged: BoxPokemon[]; toUpload: BoxPokemon[] } {
  const byId = new Map<string, BoxPokemon>();
  const fingerprints = new Set<string>();
  const toUpload: BoxPokemon[] = [];

  for (const p of remote) {
    byId.set(p.id, p);
    fingerprints.add(boxPokemonFingerprint(p));
  }

  for (const p of local) {
    if (p.note === "lab") continue;

    const existing = byId.get(p.id);
    if (existing) {
      if (p.updatedAt >= existing.updatedAt) {
        byId.set(p.id, p);
        fingerprints.add(boxPokemonFingerprint(p));
        toUpload.push(p);
      }
      continue;
    }

    const fp = boxPokemonFingerprint(p);
    if (fingerprints.has(fp)) {
      // Exact combat twin already on the account - do not create a second row.
      continue;
    }

    fingerprints.add(fp);
    byId.set(p.id, p);
    toUpload.push(p);
  }

  const merged = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  return { merged, toUpload };
}

/** @deprecated Prefer mergeGuestWithCloud - kept for any callers expecting id-only union. */
export function mergeBoxes(local: BoxPokemon[], remote: BoxPokemon[]): BoxPokemon[] {
  return mergeGuestWithCloud(local, remote).merged;
}

/** Retry failed upserts / deletes so hydrate cannot resurrect or wipe dirty rows. */
export async function flushPendingBoxSync(): Promise<void> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    const { pokemon, pendingDeletes, dirtyIds, ackDelete, ackDirty } = useBoxStore.getState();
    for (const d of pendingDeletes) {
      const ok = await syncDeletePokemon(d.id, d.screenshotPath);
      if (ok) ackDelete(d.id);
    }
    for (const id of dirtyIds) {
      const p = pokemon.find((x) => x.id === id);
      if (!p) {
        ackDirty(id);
        continue;
      }
      const ok = await syncUpsertPokemon(p);
      if (ok) ackDirty(id);
    }
  })().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

export async function hydrateBoxFromCloud(): Promise<void> {
  if (hydrateInFlight) return hydrateInFlight;
  hydrateInFlight = (async () => {
    await waitForPersist();
    const profile = await ensureProfile();
    if (!profile) return;

    const remote = await fetchRemoteBox();
    if (remote === null) return;

    const { pokemon: local, pendingDeletes, dirtyIds } = useBoxStore.getState();
    const deleted = new Set(pendingDeletes.map((d) => d.id));
    const remoteKeep = remote.filter((p) => !deleted.has(p.id));
    const localKeep = local.filter((p) => !deleted.has(p.id));

    const { merged, toUpload } = mergeGuestWithCloud(localKeep, remoteKeep);

    // Prefer in-flight local edits that failed to sync.
    const finalMap = new Map(merged.map((p) => [p.id, p]));
    for (const id of dirtyIds) {
      const loc = localKeep.find((p) => p.id === id);
      if (loc) finalMap.set(id, loc);
    }
    const final = [...finalMap.values()].sort((a, b) => b.createdAt - a.createdAt);

    if (toUpload.length > 0) {
      const ok = await syncUpsertMany(toUpload);
      if (!ok) {
        for (const p of toUpload) useBoxStore.getState().markDirty(p.id);
      }
    }

    useBoxStore.getState().replaceAll(final);

    if (!profile.migrated_local_box) {
      const leftoverDirty = useBoxStore.getState().dirtyIds;
      if (leftoverDirty.length === 0) await markBoxMigrated();
    }

    await flushPendingBoxSync();
  })().finally(() => {
    hydrateInFlight = null;
  });
  return hydrateInFlight;
}
