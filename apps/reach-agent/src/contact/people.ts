// Recherche de la personne : requêtes Exa (profils publics, pages officielles) et lecture des résultats.
// Aucun profil n'est lu : seuls le titre, l'URL et les extraits renvoyés par le moteur servent.
import type { ExaResult } from "../search/exa.ts";
import { isReadBlocked, PLATFORM_CONTACT } from "./platforms.ts";
import { fold } from "./text.ts";

export interface PersonCandidate {
  name: string;
  headline: string;
  profileUrl: string;
  /** L'entreprise apparaît dans le titre ou les extraits du profil. */
  companyMatch: boolean;
  /** Au moins la moitié des mots du rôle cherché apparaissent dans le titre ou les extraits. */
  roleMatch: boolean;
}

export interface PlatformProfile {
  url: string;
  title: string;
  contact: typeof PLATFORM_CONTACT;
}

const RESULTS_PER_QUERY = 8;
const OFFICIAL_PAGES_RESULTS = 5;

// `category: "people"` n'accepte ni filtre de date ni `excludeDomains` (HTTP 400, docs/research/phase5.md §1).
export function peopleSearchRequest(role: string, company: string): Record<string, unknown> {
  return { query: `${role} at ${company}`, type: "auto", category: "people", numResults: RESULTS_PER_QUERY, contents: { highlights: true } };
}

export function linkedinProfilesRequest(role: string, company: string): Record<string, unknown> {
  return {
    query: `site:linkedin.com/in "${role}" "${company}"`,
    type: "auto",
    includeDomains: ["linkedin.com/in"],
    numResults: RESULTS_PER_QUERY,
    contents: { highlights: true },
  };
}

export function officialPagesRequest(role: string, company: string, domain: string): Record<string, unknown> {
  return { query: `${company} team leadership about press contact ${role}`, type: "auto", includeDomains: [domain], numResults: OFFICIAL_PAGES_RESULTS };
}

const TITLE_SEPARATOR = /\s+[-–—|·]\s+/;
const PERSON_NAME = /^\p{L}[\p{L}'.-]*(?:\s+\p{L}[\p{L}'.-]*){1,3}$/u;
const LEGAL_FORMS = /\b(?:sas|sasu|sa|sarl|eurl|gmbh|ltd|limited|inc|llc|bv|ag|srl|spa|plc|corp|corporation)\b\.?/g;
const ROLE_STOP_WORDS = new Set(["the", "and", "for", "des", "les", "une", "chez", "head"]);

/** « Jane Doe - Head of Procurement - Acme | LinkedIn » → `{ name: "Jane Doe", headline: "Head of Procurement · Acme" }`. */
export function parseProfileTitle(title: string): { name: string; headline: string } | null {
  const [name = "", ...rest] = title.replace(/\s*\|\s*LinkedIn\s*$/i, "").split(TITLE_SEPARATOR).map((part) => part.trim());
  return PERSON_NAME.test(name) ? { name, headline: rest.join(" · ") } : null;
}

export function companyKey(company: string): string {
  return fold(company).replace(LEGAL_FORMS, " ").replace(/\s+/g, " ").trim();
}

function roleMatches(role: string, haystack: string): boolean {
  const tokens = fold(role).split(/[^a-z0-9]+/).filter((token) => token.length >= 3 && !ROLE_STOP_WORDS.has(token));
  return tokens.length > 0 && tokens.filter((token) => haystack.includes(token)).length * 2 >= tokens.length;
}

/** Sépare les profils de plateformes freelance (jamais lus) des personnes candidates, dédoublonnées par nom. */
export function toCandidates(results: readonly ExaResult[], company: string, role: string): { people: PersonCandidate[]; platformProfiles: PlatformProfile[] } {
  const key = companyKey(company);
  const people = new Map<string, PersonCandidate>();
  const platformProfiles: PlatformProfile[] = [];
  for (const result of results) {
    if (isReadBlocked(result.url)) {
      if (!platformProfiles.some((profile) => profile.url === result.url)) {
        platformProfiles.push({ url: result.url, title: result.title ?? result.url, contact: PLATFORM_CONTACT });
      }
      continue;
    }
    const parsed = result.title ? parseProfileTitle(result.title) : null;
    if (!parsed) continue;
    const haystack = fold(`${result.title} ${result.highlights.join(" ")}`);
    const candidate: PersonCandidate = {
      name: parsed.name,
      headline: parsed.headline,
      profileUrl: result.url,
      companyMatch: key.length > 0 && haystack.includes(key),
      roleMatch: roleMatches(role, haystack),
    };
    const existing = people.get(fold(parsed.name));
    if (!existing || (candidate.companyMatch && !existing.companyMatch)) people.set(fold(parsed.name), candidate);
  }
  return { people: [...people.values()], platformProfiles };
}
