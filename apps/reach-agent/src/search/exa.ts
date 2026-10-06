// Client HTTP minimal pour l'API Exa (`/search`, `/contents`), d'après le skill officiel `build-with-exa`.
// HTTP brut plutôt que `exa-js` : le SDK n'accepte pas d'AbortSignal, or chaque appel doit respecter l'échéance du lot.
import { isRecord, type JsonRecord } from "./json.ts";

const EXA_BASE_URL = "https://api.exa.ai";
const ERROR_EXCERPT_LENGTH = 300;

export interface ExaResult {
  url: string;
  title: string | null;
  publishedDate: string | null;
  highlights: string[];
  text: string | null;
}

export interface ExaStatus {
  id: string;
  status: string;
}

export interface ExaResponse {
  results: ExaResult[];
  statuses: ExaStatus[];
}

export function exaApiKey(): string {
  const key = process.env.EXA_API_KEY;
  if (!key) throw new Error("Missing EXA_API_KEY");
  return key;
}

function optionalString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function parseExaResponse(payload: unknown): ExaResponse {
  if (!isRecord(payload) || !Array.isArray(payload.results)) throw new Error("Exa returned an unexpected payload");
  const results: ExaResult[] = [];
  for (const item of payload.results) {
    const url = isRecord(item) ? optionalString(item, "url") : null;
    if (!isRecord(item) || !url) continue;
    const highlights = Array.isArray(item.highlights) ? item.highlights.filter((h): h is string => typeof h === "string") : [];
    results.push({ url, title: optionalString(item, "title"), publishedDate: optionalString(item, "publishedDate"), highlights, text: optionalString(item, "text") });
  }
  const statuses: ExaStatus[] = [];
  for (const item of Array.isArray(payload.statuses) ? payload.statuses : []) {
    if (!isRecord(item)) continue;
    const id = optionalString(item, "id");
    const status = optionalString(item, "status");
    if (id && status) statuses.push({ id, status });
  }
  return { results, statuses };
}

export async function callExa(endpoint: "/search" | "/contents", body: Record<string, unknown>, signal: AbortSignal): Promise<ExaResponse> {
  const response = await fetch(`${EXA_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": exaApiKey() },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, ERROR_EXCERPT_LENGTH);
    throw new Error(`Exa ${endpoint} HTTP ${response.status}: ${detail}`);
  }
  return parseExaResponse(await response.json());
}
