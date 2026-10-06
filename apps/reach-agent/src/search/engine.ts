import { readCache, SEARCH_TTL_MS, writeCache } from "./cache.ts";
import { searchLinkedin, searchWeb } from "./channels/exa.ts";
import { searchGithub } from "./channels/github.ts";
import { searchYoutube } from "./channels/youtube.ts";
import { isFresh } from "./dates.ts";
import { collectBefore, createLimiter, type Limiter } from "./limit.ts";
import { CHANNELS, type Channel, type ChannelSearch, type SearchBatchResult, type SearchFailure, type SearchHit, type SearchQuery } from "./types.ts";
import { normalizeUrl } from "./url.ts";

export const DEFAULT_SEARCH_DEADLINE_MS = 25_000;
const DEFAULT_CHANNELS: readonly Channel[] = ["web", "linkedin", "github", "youtube"];
const MAX_SNIPPET_LENGTH = 300;
const MAX_HITS = 60;

interface ChannelConfig {
  /** Plafond de requêtes simultanées, partagé par toutes les sessions du processus. */
  limit: Limiter;
  timeoutMs: number;
  /** Absent : canal prévu mais sans implémentation (Twitter, Reddit tant que les comptes n'existent pas). */
  search?: ChannelSearch;
}

const CHANNEL_CONFIG: Record<Channel, ChannelConfig> = {
  web: { limit: createLimiter(6), timeoutMs: 12_000, search: searchWeb },
  linkedin: { limit: createLimiter(3), timeoutMs: 12_000, search: searchLinkedin },
  github: { limit: createLimiter(3), timeoutMs: 10_000, search: searchGithub },
  youtube: { limit: createLimiter(2), timeoutMs: 20_000, search: searchYoutube },
  twitter: { limit: createLimiter(2), timeoutMs: 15_000 },
  reddit: { limit: createLimiter(2), timeoutMs: 15_000 },
};

export function enabledChannels(raw = process.env.REACH_CHANNELS): Set<Channel> {
  if (!raw?.trim()) return new Set(DEFAULT_CHANNELS);
  const requested = raw.split(",").map((name) => name.trim());
  return new Set(CHANNELS.filter((channel) => requested.includes(channel)));
}

function isHitList(value: unknown): value is SearchHit[] {
  return Array.isArray(value) && value.every((hit) => typeof hit === "object" && hit !== null && "url" in hit && typeof hit.url === "string");
}

type QueryOutcome = { hits: SearchHit[]; cached: boolean } | { failure: SearchFailure };

/** Garde un seul hit par URL normalisée, en préférant celui qui est daté (le plus récent). */
function dedupe(hits: readonly SearchHit[]): SearchHit[] {
  const byUrl = new Map<string, SearchHit>();
  for (const hit of hits) {
    const key = normalizeUrl(hit.url);
    const existing = byUrl.get(key);
    if (!existing || (hit.publishedAt !== null && (existing.publishedAt === null || hit.publishedAt > existing.publishedAt))) byUrl.set(key, hit);
  }
  return [...byUrl.values()];
}

/** Alterne les canaux pour garder de la diversité dans les `MAX_HITS` premiers résultats. */
function roundRobin(hits: readonly SearchHit[]): SearchHit[] {
  const queues = new Map<Channel, SearchHit[]>();
  for (const hit of hits) queues.set(hit.channel, [...(queues.get(hit.channel) ?? []), hit]);
  const ordered: SearchHit[] = [];
  while (ordered.length < MAX_HITS && [...queues.values()].some((queue) => queue.length > 0)) {
    for (const queue of queues.values()) {
      const next = queue.shift();
      if (next && ordered.length < MAX_HITS) ordered.push(next);
    }
  }
  return ordered;
}

export async function searchBatch(
  queries: readonly SearchQuery[],
  options: { deadlineMs?: number; signal: AbortSignal; channels?: Set<Channel> },
): Promise<SearchBatchResult> {
  const startedAt = performance.now();
  const channels = options.channels ?? enabledChannels();
  const deadline = AbortSignal.any([options.signal, AbortSignal.timeout(options.deadlineMs ?? DEFAULT_SEARCH_DEADLINE_MS)]);

  const runQuery = async (query: SearchQuery): Promise<QueryOutcome> => {
    const config = CHANNEL_CONFIG[query.channel];
    if (!channels.has(query.channel)) return { failure: { channel: query.channel, query: query.query, reason: "channel disabled" } };
    const search = config.search;
    if (!search) return { failure: { channel: query.channel, query: query.query, reason: "channel not implemented" } };
    const key = `${query.channel}|${query.query}|${query.freshnessDays ?? ""}`;
    try {
      const cached = await readCache(key, SEARCH_TTL_MS, isHitList);
      if (cached) return { hits: cached, cached: true };
      const hits = await config.limit(() => {
        if (deadline.aborted) throw new Error("timeout");
        return search(query, { signal: deadline, timeoutMs: config.timeoutMs });
      });
      const now = Date.now();
      const fresh = hits.filter((hit) => isFresh(hit.publishedAt, query.freshnessDays, now));
      await writeCache(key, fresh);
      return { hits: fresh, cached: false };
    } catch (error) {
      const reason = deadline.aborted ? "timeout" : error instanceof Error ? error.message : String(error);
      return { failure: { channel: query.channel, query: query.query, reason } };
    }
  };

  const outcomes = await collectBefore(queries, deadline, runQuery);
  const hits: SearchHit[] = [];
  const failures: SearchFailure[] = [];
  let fromCache = 0;
  outcomes.forEach((outcome, index) => {
    const query = queries[index];
    if (!query) return;
    if (!outcome) failures.push({ channel: query.channel, query: query.query, reason: "timeout" });
    else if ("failure" in outcome) failures.push(outcome.failure);
    else {
      hits.push(...outcome.hits);
      if (outcome.cached) fromCache++;
    }
  });

  const trimmed = dedupe(hits).map((hit) => ({ ...hit, snippet: hit.snippet.slice(0, MAX_SNIPPET_LENGTH) }));
  return { hits: roundRobin(trimmed), failures, elapsedMs: Math.round(performance.now() - startedAt), fromCache };
}
