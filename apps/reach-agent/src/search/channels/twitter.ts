// `twitter search --json` (twitter-cli) : enveloppe `{ ok, schema_version, data }`, `data` = tweets sérialisés par
// `tweet_to_dict` (twitter_cli/serialization.py) : `id`, `text`, `author.screenName`, `createdAtISO`.
// Authentification : `TWITTER_AUTH_TOKEN` + `TWITTER_CT0`. Sans elles, la CLI lirait les cookies du navigateur : on refuse.
import { toIsoDate } from "../dates.ts";
import { runCommand } from "../run-command.ts";
import type { ChannelSearch, SearchHit, SearchQuery } from "../types.ts";
import { isRecord, type JsonRecord } from "../json.ts";
import { unwrapCliEnvelope } from "./cli-envelope.ts";

const RESULTS_PER_QUERY = 10;
const TITLE_TEXT_LENGTH = 80;
const DAY_MS = 86_400_000;
const AUTH_ENV_VARS = ["TWITTER_AUTH_TOKEN", "TWITTER_CT0"] as const;

function stringField(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

export function parseTwitterOutput(output: string): SearchHit[] {
  const data = unwrapCliEnvelope(output, "twitter");
  if (!Array.isArray(data)) throw new Error("twitter returned a non-array data field");
  const hits: SearchHit[] = [];
  for (const tweet of data) {
    if (!isRecord(tweet) || !isRecord(tweet.author)) continue;
    const id = stringField(tweet, "id");
    const screenName = stringField(tweet.author, "screenName");
    if (!id || !screenName) continue;
    const text = collapse(stringField(tweet, "text") ?? "");
    hits.push({
      channel: "twitter",
      title: `@${screenName}: ${text.slice(0, TITLE_TEXT_LENGTH)}`,
      url: `https://x.com/${screenName}/status/${id}`,
      snippet: text,
      publishedAt: toIsoDate(stringField(tweet, "createdAtISO")),
      source: "x.com",
    });
  }
  return hits;
}

/** Opérateur de recherche X `since:YYYY-MM-DD`, calculé depuis `now`. */
export function buildTwitterQuery(query: SearchQuery, now: number): string {
  if (query.freshnessDays === undefined) return query.query;
  const since = new Date(now - query.freshnessDays * DAY_MS).toISOString().slice(0, 10);
  return `${query.query} since:${since}`;
}

export function buildTwitterArgs(query: SearchQuery, now: number): string[] {
  // `--` : une requête commençant par `-` ne doit jamais être lue comme une option.
  return ["search", "-n", String(RESULTS_PER_QUERY), "--json", "--", buildTwitterQuery(query, now)];
}

export function twitterCredentialsPresent(): boolean {
  return AUTH_ENV_VARS.every((name) => Boolean(process.env[name]));
}

export const searchTwitter: ChannelSearch = async (query, { signal, timeoutMs }) => {
  if (!twitterCredentialsPresent()) throw new Error(`twitter credentials missing: ${AUTH_ENV_VARS.join(" + ")}`);
  return parseTwitterOutput(await runCommand("twitter", buildTwitterArgs(query, Date.now()), { signal, timeoutMs }));
};
