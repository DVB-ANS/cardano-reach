// Usage : node scripts/bench-search.ts "<requête>" — une requête par canal actif, mesure durée, hits, part datée, erreurs.
import { enabledChannels, searchBatch } from "../src/search/engine.ts";
import type { Channel } from "../src/search/types.ts";

const query = process.argv[2];
if (!query?.trim()) throw new Error('Usage: node scripts/bench-search.ts "<requête>"');

// Cache désactivé pour mesurer les vraies latences.
process.env.REACH_CACHE_DIR = `${process.env.TMPDIR ?? "/tmp"}/reach-bench-${process.pid}`;

const channels = enabledChannels();
const rows = await Promise.all(
  [...channels].map(async (channel: Channel) => {
    const result = await searchBatch([{ channel, query }], { signal: new AbortController().signal, channels });
    const dated = result.hits.filter((hit) => hit.publishedAt !== null).length;
    return {
      channel,
      ms: result.elapsedMs,
      hits: result.hits.length,
      dated: result.hits.length ? `${Math.round((dated / result.hits.length) * 100)}%` : "-",
      errors: result.failures.map((failure) => failure.reason).join(" | "),
    };
  }),
);
console.table(rows);
