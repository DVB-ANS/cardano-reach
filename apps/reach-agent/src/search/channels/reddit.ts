// `rdt search --compact --json` (rdt-cli) : enveloppe `{ ok, schema_version, data }`, `data` = `Post.to_dict()`
// (rdt_cli/models.py, rempli par `parse_post` de rdt_cli/parser.py) : `title`, `subreddit`, `permalink`, `created_utc` (s).
// Authentification : `~/.config/rdt-cli/credential.json`. Sans ce fichier, la CLI lirait les cookies du navigateur : on refuse.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runCommand } from "../run-command.ts";
import type { ChannelSearch, SearchHit, SearchQuery } from "../types.ts";
import { isRecord, type JsonRecord } from "../json.ts";
import { unwrapCliEnvelope } from "./cli-envelope.ts";

const RESULTS_PER_QUERY = 10;
const REDDIT_ORIGIN = "https://www.reddit.com";
const CREDENTIAL_FILE = join(homedir(), ".config", "rdt-cli", "credential.json");

function stringField(record: JsonRecord, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

/** `created_utc` vaut 0 quand Reddit ne le fournit pas (`_as_float` de rdt-cli) : pas de date dans ce cas. */
export function redditDate(createdUtc: unknown): string | null {
  return typeof createdUtc === "number" && createdUtc > 0 ? new Date(createdUtc * 1000).toISOString() : null;
}

function redditUrl(post: JsonRecord): string {
  const permalink = stringField(post, "permalink");
  if (permalink) return permalink.startsWith("http") ? permalink : `${REDDIT_ORIGIN}${permalink}`;
  return stringField(post, "url");
}

export function parseRedditOutput(output: string): SearchHit[] {
  const data = unwrapCliEnvelope(output, "rdt");
  if (!Array.isArray(data)) throw new Error("rdt returned a non-array data field");
  const hits: SearchHit[] = [];
  for (const post of data) {
    if (!isRecord(post)) continue;
    const title = stringField(post, "title");
    const url = redditUrl(post);
    if (!title || !url) continue;
    const subreddit = stringField(post, "subreddit");
    const body = stringField(post, "selftext") || stringField(post, "url");
    hits.push({
      channel: "reddit",
      title: subreddit ? `${title} — r/${subreddit}` : title,
      url,
      snippet: body.replace(/\s+/g, " ").trim(),
      publishedAt: redditDate(post.created_utc),
      source: "reddit.com",
    });
  }
  return hits;
}

export function buildRedditArgs(query: SearchQuery): string[] {
  // `--` : une requête commençant par `-` ne doit jamais être lue comme une option.
  return ["search", "--limit", String(RESULTS_PER_QUERY), "--compact", "--json", "--", query.query];
}

export function redditCredentialsPresent(): boolean {
  return existsSync(CREDENTIAL_FILE);
}

export const searchReddit: ChannelSearch = async (query, { signal, timeoutMs }) => {
  if (!redditCredentialsPresent()) throw new Error(`reddit credentials missing: ${CREDENTIAL_FILE}`);
  return parseRedditOutput(await runCommand("rdt", buildRedditArgs(query), { signal, timeoutMs }));
};
