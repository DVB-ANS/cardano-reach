// Outil `find_contact` : pour une entreprise (nom + domaine officiel) et un rôle, la personne, son e-mail avec un statut
// (published / guessed / not_found) et l'état courrier du domaine. Aucune vérification SMTP, aucun login.
import type { ModelMessage } from "ai";
import { assertSearchAllowed } from "../phase.ts";
import { callExa, type ExaResponse } from "../search/exa.ts";
import { readPages, type PageResult } from "../search/pages.ts";
import { normalizeUrl } from "../search/url.ts";
import { companyMailDomains, extractEmails, genericContacts, isPersonal, localPart, trustedMailDomains, type FoundEmail } from "./emails.ts";
import { githubCommitEmails, githubGet } from "./github.ts";
import { gravatarExists, gravatarUrl } from "./gravatar.ts";
import { checkMailDomain, systemDns, type MailDns, type MailDomainCheck } from "./mail-domain.ts";
import { companyKey, domainEmailsRequest, linkedinProfilesRequest, officialPagesRequest, peopleSearchRequest, toCandidates, type PersonCandidate, type PlatformProfile } from "./people.ts";
import { isReadBlocked, PLATFORM_CONTACT } from "./platforms.ts";
import { bareDomain, fold, hostMatches } from "./text.ts";
import { buildLocal, emailVariants, inferFormat, matchingPatterns, splitName, type EmailPattern, type NameParts } from "./variants.ts";

export interface FindContactInput {
  company: string;
  /** Domaine officiel (`acme.fr`) ou URL du site. */
  domain: string;
  role: string;
}

export type EmailFinding =
  | { status: "published"; address: string; sourceUrl: string }
  /** Variante devinée dont l'existence est prouvée hors SMTP (`gravatar` : une image existe pour cette adresse). */
  | { status: "confirmed"; address: string; method: "gravatar"; sourceUrl: string }
  | {
      status: "guessed";
      address: string;
      pattern: EmailPattern;
      /** `published_format` : format d'adresses publiées nommées ; `published_shape` : forme seule ; `default_pattern` : aucun indice. */
      basis: "published_format" | "published_shape" | "default_pattern";
      /** `low` : aucune adresse publiée du domaine, simple variante la plus courante. */
      confidence: "low" | "medium";
      evidence: FoundEmail[];
      alternatives: string[];
    }
  | { status: "not_found"; reason: string; generic: FoundEmail | null };

export interface ContactPerson {
  name: string;
  headline: string;
  /** Page officielle du domaine qui cite la personne, sinon son profil public. */
  proofUrl: string;
  proofKind: "official_page" | "public_profile";
  profileUrl: string;
  /** « rôle non confirmé » : le titre du profil ne correspond pas au rôle cherché. */
  roleStatus: "rôle confirmé" | "rôle non confirmé";
}

export interface ContactFailure {
  step: string;
  reason: string;
}

export interface FindContactResult {
  company: string;
  domain: string;
  role: string;
  person: ContactPerson | null;
  /** Autres profils trouvés, à vérifier (entreprise ou rôle pas toujours confirmés). */
  otherCandidates: PersonCandidate[];
  email: EmailFinding;
  genericEmails: FoundEmail[];
  /** MX du domaine de courrier retenu pour deviner (celui des adresses publiées, sinon celui du site). */
  mailDomain: MailDomainCheck | null;
  /** Profils de plateformes freelance : jamais lus, contact sur la plateforme uniquement. */
  platformProfiles: PlatformProfile[];
  pagesRead: string[];
  failures: ContactFailure[];
  elapsedMs: number;
}

export interface ContactDeps {
  exaSearch(body: Record<string, unknown>, signal: AbortSignal): Promise<ExaResponse>;
  readPages(urls: readonly string[], options: { deadlineMs: number; signal: AbortSignal }): Promise<PageResult[]>;
  dns(signal: AbortSignal): MailDns;
  /** Adresses des commits publics de l'organisation GitHub de l'entreprise (site déclaré vérifié). */
  githubEmails(company: string, domain: string, signal: AbortSignal): Promise<FoundEmail[]>;
  /** Vrai si une image Gravatar existe pour l'adresse ; faux ne prouve rien. */
  gravatarExists(address: string, signal: AbortSignal): Promise<boolean>;
}

const defaultDeps: ContactDeps = {
  exaSearch: (body, signal) => callExa("/search", body, signal),
  readPages,
  dns: systemDns,
  githubEmails: (company, domain, signal) => githubCommitEmails(company, domain, githubGet, signal),
  gravatarExists,
};

export const FIND_CONTACT_DEADLINE_MS = 25_000;
const EXA_TIMEOUT_MS = 12_000;
// Pages où figurent le plus souvent noms, rôles et adresses (les mentions légales FR / DE contiennent souvent un e-mail).
const STANDARD_PATHS = ["", "contact", "about", "team", "equipe", "a-propos", "mentions-legales", "impressum"];
const MAX_DISCOVERED_PAGES = 4;
const MIN_READ_BUDGET_MS = 2_000;
const MAX_OTHER_CANDIDATES = 3;
const MAX_ALTERNATIVES = 3;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Statut de l'e-mail de `person` à partir des adresses lues sur les pages officielles. Ne contacte aucun serveur.
 * `domains` : domaines de courrier de l'entreprise (`companyMailDomains`) ; on devine sur le premier.
 */
export function decideEmail(params: {
  person: NameParts | null;
  domains: readonly string[];
  emails: readonly FoundEmail[];
  knownNames: readonly NameParts[];
  mail: MailDomainCheck | null;
}): EmailFinding {
  const { person, domains, emails, knownNames, mail } = params;
  const generic = genericContacts(emails, domains)[0] ?? null;
  if (!person) return { status: "not_found", reason: "personne non identifiée", generic };
  const own = emails.find((email) => isPersonal(email.address, domains) && matchingPatterns(localPart(email.address), person).length > 0);
  if (own) return { status: "published", address: own.address, sourceUrl: own.sourceUrl };
  const [domain] = domains;
  if (!domain) return { status: "not_found", reason: "aucun domaine de courrier", generic };
  if (mail && (mail.mx === "none" || mail.mx === "null_mx")) return { status: "not_found", reason: `le domaine ne reçoit pas de courrier (${mail.mx})`, generic };

  const personal = emails.filter((email) => isPersonal(email.address, [domain]));
  const format = inferFormat(personal.map((email) => email.address), [person, ...knownNames]);
  const pattern = format?.pattern ?? emailVariants(person)[0]?.pattern ?? "first.last";
  const evidence = format ? personal.filter((email) => format.evidence.includes(email.address)) : [];
  return {
    status: "guessed",
    address: `${buildLocal(pattern, person)}@${domain}`,
    pattern,
    basis: !format ? "default_pattern" : format.basis === "name_match" ? "published_format" : "published_shape",
    confidence: format ? "medium" : "low",
    evidence,
    alternatives: emailVariants(person)
      .filter((variant) => variant.pattern !== pattern)
      .slice(0, MAX_ALTERNATIVES)
      .map((variant) => `${variant.local}@${domain}`),
  };
}

function officialPageFor(name: string, pages: readonly PageResult[]): string | null {
  const folded = fold(name);
  return pages.find((page) => fold(page.text).includes(folded))?.url ?? null;
}

/** Personne retenue : citée sur une page officielle ou rattachée à l'entreprise par son profil ; sinon aucune. */
function choosePerson(candidates: readonly PersonCandidate[], pages: readonly PageResult[]): { person: ContactPerson | null; others: PersonCandidate[] } {
  const scored = candidates
    .map((candidate) => {
      const officialUrl = officialPageFor(candidate.name, pages);
      const score = (officialUrl ? 4 : 0) + (candidate.companyMatch ? 2 : 0) + (candidate.roleMatch ? 1 : 0);
      return { candidate, officialUrl, score };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || (!best.officialUrl && !best.candidate.companyMatch)) {
    return { person: null, others: scored.slice(0, MAX_OTHER_CANDIDATES).map((entry) => entry.candidate) };
  }
  const { candidate, officialUrl } = best;
  return {
    person: {
      name: candidate.name,
      headline: candidate.headline,
      proofUrl: officialUrl ?? candidate.profileUrl,
      proofKind: officialUrl ? "official_page" : "public_profile",
      profileUrl: candidate.profileUrl,
      roleStatus: candidate.roleMatch ? "rôle confirmé" : "rôle non confirmé",
    },
    others: scored.slice(1, MAX_OTHER_CANDIDATES + 1).map((entry) => entry.candidate),
  };
}

export async function findContact(
  input: FindContactInput,
  options: { signal: AbortSignal; deadlineMs?: number; deps?: ContactDeps },
): Promise<FindContactResult> {
  const startedAt = performance.now();
  const deadlineMs = options.deadlineMs ?? FIND_CONTACT_DEADLINE_MS;
  const deps = options.deps ?? defaultDeps;
  const deadline = AbortSignal.any([options.signal, AbortSignal.timeout(deadlineMs)]);
  // Entier : `AbortSignal.timeout` (dans `readPages`) rejette un délai fractionnaire.
  const remaining = () => Math.max(0, Math.floor(deadlineMs - (performance.now() - startedAt)));
  const domain = bareDomain(input.domain);
  const failures: ContactFailure[] = [];
  const result = (fields: Pick<FindContactResult, "person" | "otherCandidates" | "email" | "genericEmails" | "mailDomain" | "platformProfiles" | "pagesRead">): FindContactResult => ({
    company: input.company,
    domain,
    role: input.role,
    ...fields,
    failures,
    elapsedMs: Math.round(performance.now() - startedAt),
  });

  const homepage = `https://${domain}/`;
  if (isReadBlocked(homepage)) {
    failures.push({ step: "domain", reason: `plateforme freelance : lecture interdite, ${PLATFORM_CONTACT}` });
    return result({
      person: null,
      otherCandidates: [],
      email: { status: "not_found", reason: PLATFORM_CONTACT, generic: null },
      genericEmails: [],
      mailDomain: null,
      platformProfiles: [{ url: homepage, title: input.company, contact: PLATFORM_CONTACT }],
      pagesRead: [],
    });
  }

  const attempt = async <T>(step: string, task: () => Promise<T>): Promise<T | null> => {
    try {
      return await task();
    } catch (error) {
      failures.push({ step, reason: deadline.aborted ? "timeout" : errorMessage(error) });
      return null;
    }
  };
  const exa = (step: string, body: Record<string, unknown>) =>
    attempt(step, () => deps.exaSearch(body, AbortSignal.any([deadline, AbortSignal.timeout(EXA_TIMEOUT_MS)])));
  const read = (urls: readonly string[]) => attempt("read_pages", () => deps.readPages(urls, { deadlineMs: remaining(), signal: deadline }));

  const standardUrls = STANDARD_PATHS.map((path) => `https://${domain}/${path}`);
  const [peopleHits, profileHits, siteHits, standardPages, commitEmails, webHits] = await Promise.all([
    exa("exa_people", peopleSearchRequest(input.role, input.company)),
    exa("linkedin_profiles", linkedinProfilesRequest(input.role, input.company)),
    exa("official_pages_search", officialPagesRequest(input.role, input.company, domain)),
    read(standardUrls),
    attempt("github_commits", () => deps.githubEmails(input.company, domain, deadline)),
    exa("domain_emails_web", domainEmailsRequest(domain)),
  ]);

  const known = new Set(standardUrls.map(normalizeUrl));
  const discovered: string[] = [];
  for (const { url } of siteHits?.results ?? []) {
    if (discovered.length >= MAX_DISCOVERED_PAGES) break;
    if (!URL.canParse(url) || !hostMatches(new URL(url).hostname.toLowerCase(), domain) || isReadBlocked(url) || known.has(normalizeUrl(url))) continue;
    known.add(normalizeUrl(url));
    discovered.push(url);
  }
  const discoveredPages = discovered.length && remaining() > MIN_READ_BUDGET_MS ? await read(discovered) : null;
  for (const page of discoveredPages ?? []) if (!page.ok) failures.push({ step: "read_pages", reason: `${page.url}: ${page.error ?? "unreadable"}` });

  const pages = [...(standardPages ?? []), ...(discoveredPages ?? [])].filter((page) => page.ok);
  if (!pages.length) failures.push({ step: "read_pages", reason: "aucune page officielle lisible" });
  const pageEmails = pages.flatMap((page) => extractEmails(page.text).map((address) => ({ address, sourceUrl: page.url })));
  // Pages tierces : seules les adresses des domaines de l'entreprise comptent (filtre de `companyMailDomains`).
  const webEmails = (webHits?.results ?? [])
    .filter((hit) => !isReadBlocked(hit.url))
    .flatMap((hit) => extractEmails(`${hit.text ?? ""} ${hit.highlights.join(" ")}`).map((address) => ({ address, sourceUrl: hit.url })));
  const emails = [...pageEmails, ...webEmails, ...(commitEmails ?? [])];
  // Domaine vu au moins 2 fois dans les commits de l'organisation officielle : fiable même sans la marque du site
  // (Blockfrost → iohk.io). Webmail et domaines perso isolés écartés (la plupart des commits sont en @gmail.com).
  const mailDomains = companyMailDomains(emails, domain, companyKey(input.company), trustedMailDomains(commitEmails ?? []));
  const mailDomain = await attempt("mx", () => checkMailDomain(mailDomains[0] ?? domain, deps.dns(deadline)));

  const { people, platformProfiles } = toCandidates([...(peopleHits?.results ?? []), ...(profileHits?.results ?? [])], input.company, input.role);
  const { person, others } = choosePerson(people, pages);
  const knownNames = people.map((candidate) => splitName(candidate.name)).filter((name): name is NameParts => name !== null);

  const guess = decideEmail({ person: person ? splitName(person.name) : null, domains: mailDomains, emails, knownNames, mail: mailDomain });
  let email: EmailFinding = guess;
  if (guess.status === "guessed") {
    // Variante retenue d'abord, puis les alternatives : la première qui a un Gravatar existe vraiment.
    for (const address of [guess.address, ...guess.alternatives]) {
      const exists = await attempt("gravatar", () => deps.gravatarExists(address, deadline));
      if (exists === null) break;
      if (exists) {
        email = { status: "confirmed", address, method: "gravatar", sourceUrl: gravatarUrl(address) };
        break;
      }
    }
  }

  return result({
    person,
    otherCandidates: others,
    email,
    genericEmails: genericContacts(emails, mailDomains),
    mailDomain,
    platformProfiles,
    pagesRead: pages.map((page) => page.url),
  });
}

/** Point d'entrée de l'outil : refusé pendant l'intake, comme les autres outils de recherche. */
export async function runFindContact(
  messages: readonly ModelMessage[],
  input: FindContactInput,
  options: { signal: AbortSignal; deadlineMs?: number; deps?: ContactDeps },
): Promise<FindContactResult> {
  assertSearchAllowed(messages);
  return findContact(input, options);
}
