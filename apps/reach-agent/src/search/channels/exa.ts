// Canaux `web` et `linkedin` sur l'API Exa `/search` (requête recommandée : query + type auto + highlights).
import { toIsoDate } from "../dates.ts";
import { callExa, type ExaResponse } from "../exa.ts";
import type { Channel, ChannelSearch, SearchHit } from "../types.ts";

// Décision produit : un lot compte jusqu'à 12 requêtes et le moteur garde 60 hits ; 8 par requête suffit.
const RESULTS_PER_QUERY = 8;
// Le canal linkedin est par définition limité aux pages entreprise publiques (plan, lot A2).
const LINKEDIN_COMPANY_PAGES = ["linkedin.com/company"];

export function exaHits(response: ExaResponse, channel: Channel): SearchHit[] {
  return response.results.map((result) => ({
    channel,
    title: result.title ?? result.url,
    url: result.url,
    snippet: result.highlights.join(" … ").replace(/\s+/g, " ").trim(),
    publishedAt: toIsoDate(result.publishedDate),
    source: new URL(result.url).hostname.replace(/^www\./, ""),
  }));
}

async function exaSearch(body: Record<string, unknown>, channel: Channel, signal: AbortSignal, timeoutMs: number): Promise<SearchHit[]> {
  const request = { type: "auto", numResults: RESULTS_PER_QUERY, contents: { highlights: true }, ...body };
  return exaHits(await callExa("/search", request, AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])), channel);
}

const OBJECTIVE = "B2B research: rank company websites, certification pages, directories and dated announcements first; skip generic listicles.";

export const searchWeb: ChannelSearch = (query, { signal, timeoutMs }) =>
  exaSearch({ query: query.query, objective: OBJECTIVE }, "web", signal, timeoutMs);

export const searchLinkedin: ChannelSearch = (query, { signal, timeoutMs }) =>
  exaSearch({ query: query.query, includeDomains: LINKEDIN_COMPANY_PAGES }, "linkedin", signal, timeoutMs);
