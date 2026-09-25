/**
 * Evolution candy costs from pogoapi.net (cached in session).
 * https://pogoapi.net/api/v1/pokemon_evolutions.json
 */

type EvoEdge = { toDex: number; candy: number; form?: string };

type EvoJsonRow = {
  pokemon_id: number;
  pokemon_name: string;
  form?: string;
  evolutions: {
    pokemon_id: number;
    pokemon_name: string;
    candy_required: number;
    form?: string;
  }[];
};

const CACHE_KEY = "pokelead-evo-candy-v1";
let graph: Map<number, EvoEdge[]> | null = null;
let loadPromise: Promise<Map<number, EvoEdge[]>> | null = null;

function buildGraph(rows: EvoJsonRow[]): Map<number, EvoEdge[]> {
  const map = new Map<number, EvoEdge[]>();
  for (const row of rows) {
    const edges = (row.evolutions ?? [])
      .filter((e) => e.candy_required > 0)
      .map((e) => ({
        toDex: e.pokemon_id,
        candy: e.candy_required,
        form: e.form,
      }));
    if (!edges.length) continue;
    const existing = map.get(row.pokemon_id) ?? [];
    for (const edge of edges) {
      if (
        !existing.some(
          (x) => x.toDex === edge.toDex && (x.form ?? "Normal") === (edge.form ?? "Normal"),
        )
      ) {
        existing.push(edge);
      }
    }
    map.set(row.pokemon_id, existing);
  }
  return map;
}

async function fetchGraph(): Promise<Map<number, EvoEdge[]>> {
  if (graph) return graph;
  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as [number, EvoEdge[]][];
        graph = new Map(parsed);
        return graph;
      }
    } catch {
      /* ignore */
    }
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch("https://pogoapi.net/api/v1/pokemon_evolutions.json");
      if (!res.ok) throw new Error(`Evolution candy fetch failed: ${res.status}`);
      const rows = (await res.json()) as EvoJsonRow[];
      const next = buildGraph(rows);
      graph = next;
      if (typeof sessionStorage !== "undefined") {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify([...next.entries()]));
        } catch {
          /* quota */
        }
      }
      return next;
    })().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

/** Ensure candy graph is loaded (call when Include Evos turns on). */
export async function ensureEvolutionCandyLoaded(): Promise<void> {
  await fetchGraph();
}

/**
 * Total candy along the cheapest path from `fromDex` to `toDex`.
 * Dijkstra (edge weights are unequal, e.g. 25 vs 400).
 * Returns null if unknown / unreachable.
 */
export function evolutionCandyCost(fromDex: number, toDex: number): number | null {
  if (fromDex === toDex) return 0;
  if (!graph) return null;

  const best = new Map<number, number>();
  best.set(fromDex, 0);
  // Linear scan is fine: dex graph is tiny.
  const pending = new Set<number>([fromDex]);

  while (pending.size) {
    let cur: number | null = null;
    let curCost = Infinity;
    for (const d of pending) {
      const c = best.get(d) ?? Infinity;
      if (c < curCost) {
        curCost = c;
        cur = d;
      }
    }
    if (cur == null || curCost === Infinity) break;
    pending.delete(cur);
    if (cur === toDex) return curCost;

    for (const e of graph.get(cur) ?? []) {
      const nextCost = curCost + e.candy;
      const prev = best.get(e.toDex);
      if (prev == null || nextCost < prev) {
        best.set(e.toDex, nextCost);
        pending.add(e.toDex);
      }
    }
  }

  return best.has(toDex) ? best.get(toDex)! : null;
}
