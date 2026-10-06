// Lecture de pages : Jina Reader d'abord, GET direct épinglé en secours. Toute URL passe par le garde SSRF.
import { PAGE_TTL_MS, readCache, writeCache } from "./cache.ts";
import { toIsoDate } from "./dates.ts";
import { fetchPublic } from "./direct-fetch.ts";
import { collectBefore, createLimiter } from "./limit.ts";
import { BlockedHostError, resolvePublicTarget } from "./url.ts";

export interface PageResult {
  url: string;
  ok: boolean;
  title: string | null;
  publishedAt: string | null;
  text: string;
  error?: string;
}

export const DEFAULT_PAGES_DEADLINE_MS = 20_000;
const PAGE_CONCURRENCY = 8;
const JINA_TIMEOUT_MS = 15_000;
const DIRECT_TIMEOUT_MS = 10_000;
const MAX_TEXT_LENGTH = 6_000;
const JINA_READER_URL = "https://r.jina.ai/";

const pageLimit = createLimiter(PAGE_CONCURRENCY);

type PageContent = Pick<PageResult, "title" | "publishedAt" | "text">;

function isPageContent(value: unknown): value is PageContent {
  return typeof value === "object" && value !== null && "text" in value && typeof value.text === "string";
}

function header(markdown: string, name: string): string | null {
  return new RegExp(`^${name}: (.*)$`, "m").exec(markdown)?.[1]?.trim() || null;
}

export function parseJinaOutput(output: string): PageContent {
  const body = output.split(/^Markdown Content:\s*$/m)[1] ?? output;
  return { title: header(output, "Title"), publishedAt: toIsoDate(header(output, "Published Time")), text: body.trim() };
}

async function readWithJina(url: string, signal: AbortSignal): Promise<PageContent> {
  const headers: Record<string, string> = { Accept: "text/plain" };
  if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
  const response = await fetch(`${JINA_READER_URL}${url}`, { headers, signal: AbortSignal.any([signal, AbortSignal.timeout(JINA_TIMEOUT_MS)]) });
  if (!response.ok) throw new Error(`jina HTTP ${response.status}`);
  return parseJinaOutput(await response.text());
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

async function readDirect(url: string, signal: AbortSignal): Promise<PageContent> {
  const response = await fetchPublic(url, AbortSignal.any([signal, AbortSignal.timeout(DIRECT_TIMEOUT_MS)]));
  return response.contentType.includes("html") ? htmlToPage(response.body) : { title: null, publishedAt: null, text: response.body.trim() };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readPage(url: string, signal: AbortSignal): Promise<PageResult> {
  try {
    await resolvePublicTarget(url);
  } catch (error) {
    const reason = error instanceof BlockedHostError ? error.message : `invalid url: ${errorMessage(error)}`;
    return { url, ok: false, title: null, publishedAt: null, text: "", error: reason };
  }
  const key = `page|${url}`;
  const cached = await readCache(key, PAGE_TTL_MS, isPageContent);
  if (cached) return { url, ok: true, ...cached };
  try {
    let content: PageContent;
    try {
      content = await readWithJina(url, signal);
    } catch (jinaError) {
      if (signal.aborted) throw jinaError;
      content = await readDirect(url, signal);
    }
    const trimmed = { ...content, text: content.text.slice(0, MAX_TEXT_LENGTH) };
    await writeCache(key, trimmed);
    return { url, ok: true, ...trimmed };
  } catch (error) {
    return { url, ok: false, title: null, publishedAt: null, text: "", error: signal.aborted ? "timeout" : errorMessage(error) };
  }
}

export async function readPages(urls: readonly string[], options: { deadlineMs?: number; signal: AbortSignal }): Promise<PageResult[]> {
  const deadline = AbortSignal.any([options.signal, AbortSignal.timeout(options.deadlineMs ?? DEFAULT_PAGES_DEADLINE_MS)]);
  const unique = [...new Set(urls)];
  const timedOut = (url: string): PageResult => ({ url, ok: false, title: null, publishedAt: null, text: "", error: "timeout" });
  // Le limiteur rejette une attente annulée par l'échéance : on la convertit en échec, `collectBefore` exige un worker qui ne rejette pas.
  const results = await collectBefore(unique, deadline, (url) => pageLimit(() => readPage(url, deadline), deadline).catch(() => timedOut(url)));
  return results.map((result, index) => result ?? timedOut(unique[index] ?? ""));
}
