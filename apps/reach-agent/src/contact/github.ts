// Adresses e-mail des commits publics de l'organisation GitHub de l'entreprise : vrai domaine de courrier et vrai format
// (alan.com publie en @alan.eu). Une organisation n'est lue que si son site déclaré est celui de l'entreprise.
import { isRecord } from "../search/json.ts";
import type { FoundEmail } from "./emails.ts";
import { extractEmails } from "./emails.ts";
import { bareDomain, hostMatches } from "./text.ts";

/** GET sur l'API GitHub (`path` commence par `/`), corps JSON décodé. */
export type GithubGet = (path: string, signal: AbortSignal) => Promise<unknown>;

const GITHUB_API = "https://api.github.com";
const ORG_CANDIDATES = 3;
const REPOS = 3;
const COMMITS_PER_REPO = 50;
const IGNORED_MAIL_DOMAINS = ["github.com", "users.noreply.github.com"];

/** Client par défaut : `GH_TOKEN` obligatoire (60 requêtes/h sans jeton, trop peu). */
export const githubGet: GithubGet = async (path, signal) => {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("Missing GH_TOKEN");
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" },
    signal,
  });
  if (!response.ok) throw new Error(`GitHub ${path} HTTP ${response.status}`);
  return response.json();
};

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function findOrg(company: string, domain: string, get: GithubGet, signal: AbortSignal): Promise<string | null> {
  const query = new URLSearchParams({ q: `${company} type:org`, per_page: "5" }).toString().replace(/\+/g, "%20");
  const search = await get(`/search/users?${query}`, signal);
  const items = isRecord(search) && Array.isArray(search.items) ? search.items : [];
  for (const item of items.slice(0, ORG_CANDIDATES)) {
    const login = isRecord(item) ? str(item.login) : null;
    if (!login) continue;
    const org = await get(`/orgs/${encodeURIComponent(login)}`, signal);
    const blog = isRecord(org) ? str(org.blog) : null;
    if (blog && hostMatches(bareDomain(blog), domain)) return login;
  }
  return null;
}

export async function githubCommitEmails(company: string, domain: string, get: GithubGet, signal: AbortSignal): Promise<FoundEmail[]> {
  const org = await findOrg(company, domain, get, signal);
  if (!org) return [];
  const repos = await get(`/orgs/${encodeURIComponent(org)}/repos?sort=pushed&per_page=10`, signal);
  const names = (Array.isArray(repos) ? repos : [])
    .filter((repo) => isRecord(repo) && repo.fork !== true && repo.archived !== true)
    .map((repo) => (isRecord(repo) ? str(repo.name) : null))
    .filter((name): name is string => name !== null)
    .slice(0, REPOS);
  const found = new Map<string, FoundEmail>();
  for (const name of names) {
    const commits = await get(`/repos/${encodeURIComponent(org)}/${encodeURIComponent(name)}/commits?per_page=${COMMITS_PER_REPO}`, signal);
    for (const entry of Array.isArray(commits) ? commits : []) {
      if (!isRecord(entry) || !isRecord(entry.commit)) continue;
      const url = str(entry.html_url);
      if (!url) continue;
      for (const role of ["author", "committer"] as const) {
        const person = entry.commit[role];
        const raw = isRecord(person) ? str(person.email) : null;
        const [address] = raw ? extractEmails(raw) : [];
        if (!address || IGNORED_MAIL_DOMAINS.some((ignored) => hostMatches(address.slice(address.lastIndexOf("@") + 1), ignored))) continue;
        if (!found.has(address)) found.set(address, { address, sourceUrl: url });
      }
    }
  }
  return [...found.values()];
}
