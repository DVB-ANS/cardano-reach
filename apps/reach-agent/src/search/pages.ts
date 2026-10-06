// Lecture de pages : un seul appel Exa `/contents` pour tout le lot, GET direct épinglé en secours pour les URL
// qu'Exa n'a pas pu lire. Toute URL passe d'abord par le garde SSRF.
import { PAGE_TTL_MS, readCache, writeCache } from "./cache.ts";
import { toIsoDate } from "./dates.ts";
import { fetchPublic } from "./direct-fetch.ts";
import { callExa } from "./exa.ts";
import { collectBefore, createLimiter } from "./limit.ts";
import { BlockedHostError, normalizeUrl, resolvePublicTarget } from "./url.ts";

export interface PageResult {
  url: string;
  ok: boolean;
  title: string | null;
  publishedAt: string | null;
  text: string;
  error?: string;
}

export const DEFAULT_PAGES_DEADLINE_MS = 20_000;
const DIRECT_CONCURRENCY = 8;
const EXA_CONTENTS_TIMEOUT_MS = 15_000;
const DIRECT_TIMEOUT_MS = 10_000;
// Budget explicite par page (plan A2) : 6 000 caractères, pour 12 pages max par appel d'outil.
const MAX_TEXT_LENGTH = 6_000;

const directLimit = createLimiter(DIRECT_CONCURRENCY);

type PageContent = Pick<PageResult, "title" | "publishedAt" | "text">;

function isPageContent(value: unknown): value is PageContent {
  return typeof value === "object" && value !== null && "text" in value && typeof value.text === "string";
}

const HTML_ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export function htmlToPage(html: string): PageContent {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() || null;
  const published = /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  const text = html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
  return { title, publishedAt: toIsoDate(published), text };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const failed = (url: string, error: string): PageResult => ({ url, ok: false, title: null, publishedAt: null, text: "", error });

async function cachePage(url: string, content: PageContent): Promise<PageResult> {
  const trimmed = { ...content, text: content.text.slice(0, MAX_TEXT_LENGTH) };
  await writeCache(`page|${url}`, trimmed);
  return { url, ok: true, ...trimmed };
}

/** Un seul appel `/contents`. HTTP 200 n'implique pas que chaque URL a été lue : on vérifie `statuses` URL par URL. */
async function readWithExa(urls: readonly string[], signal: AbortSignal): Promise<Map<string, PageContent>> {
  const response = await callExa(
    "/contents",
    { urls, text: { maxCharacters: MAX_TEXT_LENGTH } },
    AbortSignal.any([signal, AbortSignal.timeout(EXA_CONTENTS_TIMEOUT_MS)]),
  );
  const byKey = new Map(response.results.map((result) => [normalizeUrl(result.url), result]));
  const failedKeys = new Set(response.statuses.filter((item) => item.status !== "success").map((item) => normalizeUrl(item.id)));
  const pages = new Map<string, PageContent>();
  for (const url of urls) {
    const key = normalizeUrl(url);
    const result = byKey.get(key);
    if (result?.text && !failedKeys.has(key)) pages.set(url, { title: result.title, publishedAt: toIsoDate(result.publishedDate), text: result.text });
  }
  return pages;
}

async function readDirect(url: string, signal: AbortSignal): Promise<PageResult> {
  try {
    const response = await fetchPublic(url, AbortSignal.any([signal, AbortSignal.timeout(DIRECT_TIMEOUT_MS)]));
    const content = response.contentType.includes("html") ? htmlToPage(response.body) : { title: null, publishedAt: null, text: response.body.trim() };
    return await cachePage(url, content);
  } catch (error) {
    return failed(url, signal.aborted ? "timeout" : errorMessage(error));
  }
}

export async function readPages(urls: readonly string[], options: { deadlineMs?: number; signal: AbortSignal }): Promise<PageResult[]> {
  const deadline = AbortSignal.any([options.signal, AbortSignal.timeout(options.deadlineMs ?? DEFAULT_PAGES_DEADLINE_MS)]);
  const unique = [...new Set(urls)];
  const results = new Map<string, PageResult>();
  const toFetch: string[] = [];

  for (const url of unique) {
    try {
      await resolvePublicTarget(url);
    } catch (error) {
      results.set(url, failed(url, error instanceof BlockedHostError ? error.message : `invalid url: ${errorMessage(error)}`));
      continue;
    }
    const cached = await readCache(`page|${url}`, PAGE_TTL_MS, isPageContent);
    if (cached) results.set(url, { url, ok: true, ...cached });
    else toFetch.push(url);
  }

  let fallback = toFetch;
  if (toFetch.length && process.env.EXA_API_KEY) {
    try {
      const pages = await readWithExa(toFetch, deadline);
      for (const [url, content] of pages) results.set(url, await cachePage(url, content));
      fallback = toFetch.filter((url) => !pages.has(url));
    } catch (error) {
      // Exa indisponible (quota, réseau) : toutes les URL passent par le GET direct.
      console.warn(`read_pages: Exa /contents failed, direct fallback (${errorMessage(error).slice(0, 120)})`);
    }
  }

  const timedOut = (url: string): PageResult => failed(url, "timeout");
  const direct = await collectBefore(fallback, deadline, (url) => directLimit(() => readDirect(url, deadline), deadline).catch(() => timedOut(url)));
  fallback.forEach((url, index) => results.set(url, direct[index] ?? timedOut(url)));
  return unique.map((url) => results.get(url) ?? timedOut(url));
}
