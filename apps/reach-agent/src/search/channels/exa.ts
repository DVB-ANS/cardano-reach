// Exa via mcporter (`exa.web_search_exa`), sortie texte en blocs `Title:` / `URL:` / `Published:` séparés par `---`.
import { toIsoDate } from "../dates.ts";
import { runCommand } from "../run-command.ts";
import type { Channel, ChannelSearch, SearchHit } from "../types.ts";

const RESULTS_PER_QUERY = 8;
const BLOCK_SEPARATOR = /\n---\n/;

function field(block: string, name: string): string | undefined {
  return new RegExp(`^${name}: (.*)$`, "m").exec(block)?.[1]?.trim();
}

export function parseExaOutput(output: string, channel: Channel): SearchHit[] {
  const hits: SearchHit[] = [];
  for (const block of output.split(BLOCK_SEPARATOR)) {
    const title = field(block, "Title");
    const url = field(block, "URL");
    if (!title || !url || !URL.canParse(url)) continue;
    const highlights = block.split(/^Highlights:\s*$/m)[1] ?? "";
    hits.push({
      channel,
      title,
      url,
      snippet: highlights.replace(/^\.\.\.$/gm, " ").replace(/\s+/g, " ").trim(),
      publishedAt: toIsoDate(field(block, "Published")),
      source: new URL(url).hostname.replace(/^www\./, ""),
    });
  }
  return hits;
}

async function callExa(query: string, objective: string, channel: Channel, signal: AbortSignal, timeoutMs: number): Promise<SearchHit[]> {
  const args = ["call", "exa.web_search_exa", `query=${query}`, `numResults=${RESULTS_PER_QUERY}`, `objective=${objective}`];
  return parseExaOutput(await runCommand("mcporter", args, { signal, timeoutMs }), channel);
}

export const searchWeb: ChannelSearch = (query, { signal, timeoutMs }) =>
  callExa(query.query, `Company pages, directories and recent news relevant to: ${query.query}`, "web", signal, timeoutMs);

const LINKEDIN_SITE = "site:linkedin.com/company";

export const searchLinkedin: ChannelSearch = async (query, { signal, timeoutMs }) => {
  const text = query.query.includes("site:") ? query.query : `${query.query} ${LINKEDIN_SITE}`;
  const hits = await callExa(text, `Public LinkedIn company pages matching: ${query.query}`, "linkedin", signal, timeoutMs);
  return hits.filter((hit) => hit.source === "linkedin.com" || hit.source.endsWith(".linkedin.com"));
};
