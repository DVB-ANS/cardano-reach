// `gh search repos --json` : tableau JSON. `updatedAt` sert de date. Recherche par mots-clés (ET logique) : requêtes courtes.
import { toIsoDate } from "../dates.ts";
import { runCommand } from "../run-command.ts";
import type { ChannelSearch, SearchHit } from "../types.ts";

const RESULTS_PER_QUERY = 8;

interface GithubRepo {
  fullName: string;
  url: string;
  description: string;
  updatedAt: string;
  stargazersCount: number;
}

function isGithubRepo(value: unknown): value is GithubRepo {
  if (typeof value !== "object" || value === null) return false;
  const repo = value as Record<string, unknown>;
  return (
    typeof repo.fullName === "string" &&
    typeof repo.url === "string" &&
    typeof repo.description === "string" &&
    typeof repo.updatedAt === "string" &&
    typeof repo.stargazersCount === "number"
  );
}

export function parseGithubOutput(output: string): SearchHit[] {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) throw new Error("gh returned a non-array payload");
  return parsed.filter(isGithubRepo).map((repo) => ({
    channel: "github",
    title: repo.fullName,
    url: repo.url,
    snippet: `${repo.description} (★ ${repo.stargazersCount})`.trim(),
    publishedAt: toIsoDate(repo.updatedAt),
    source: "github.com",
  }));
}

export const searchGithub: ChannelSearch = async (query, { signal, timeoutMs }) => {
  // `--` : une requête commençant par `-` ne doit jamais être lue comme une option de gh.
  const args = ["search", "repos", "--limit", String(RESULTS_PER_QUERY), "--json", "fullName,url,description,updatedAt,stargazersCount", "--", query.query];
  return parseGithubOutput(await runCommand("gh", args, { signal, timeoutMs }));
};
