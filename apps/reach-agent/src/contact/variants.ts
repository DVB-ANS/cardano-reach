// Variantes d'adresse à partir d'un nom, et déduction du format d'un domaine depuis ses adresses publiées.
import { fold } from "./text.ts";

export interface NameParts {
  first: string;
  last: string;
}

type Builder = (first: string, last: string) => string;

// Ordre = fréquence approximative en entreprise : la première variante sert quand aucun format n'est déduit.
const PATTERNS = {
  "first.last": (f, l) => `${f}.${l}`,
  flast: (f, l) => `${f[0]}${l}`,
  first: (f) => f,
  firstlast: (f, l) => `${f}${l}`,
  "f.last": (f, l) => `${f[0]}.${l}`,
  "last.first": (f, l) => `${l}.${f}`,
  last: (_f, l) => l,
  first_last: (f, l) => `${f}_${l}`,
  "first-last": (f, l) => `${f}-${l}`,
  lastf: (f, l) => `${l}${f[0]}`,
  "first.l": (f, l) => `${f}.${l[0]}`,
  firstl: (f, l) => `${f}${l[0]}`,
} satisfies Record<string, Builder>;

export type EmailPattern = keyof typeof PATTERNS;

export interface EmailVariant {
  pattern: EmailPattern;
  local: string;
}

export interface InferredFormat {
  pattern: EmailPattern;
  /** Adresses publiées qui appuient le format. */
  evidence: string[];
  /** `name_match` : une adresse correspond au nom d'une personne connue ; `shape` : déduit de la forme seule. */
  basis: "name_match" | "shape";
}

const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "mme", "mlle", "m", "prof", "pr", "me"]);

function namePart(raw: string): string {
  return fold(raw).replace(/[^a-z-]/g, "").replace(/^-+|-+$/g, "");
}

/** « Dr. Jean-Pierre de La Tour » → `{ first: "jean-pierre", last: "delatour" }` ; `null` sans prénom et nom. */
export function splitName(fullName: string): NameParts | null {
  const tokens = fullName.split(/\s+/).map(namePart).filter((token) => token && !HONORIFICS.has(token));
  const [first, ...rest] = tokens;
  const last = rest.join("");
  return first && last ? { first, last } : null;
}

export function emailVariants(name: NameParts): EmailVariant[] {
  const seen = new Set<string>();
  const variants: EmailVariant[] = [];
  for (const [pattern, build] of Object.entries(PATTERNS) as Array<[EmailPattern, Builder]>) {
    const local = build(name.first, name.last);
    if (!seen.has(local)) {
      seen.add(local);
      variants.push({ pattern, local });
    }
  }
  return variants;
}

export function buildLocal(pattern: EmailPattern, name: NameParts): string {
  const build: Builder = PATTERNS[pattern];
  return build(name.first, name.last);
}

export function matchingPatterns(local: string, name: NameParts): EmailPattern[] {
  return emailVariants(name).filter((variant) => variant.local === local).map((variant) => variant.pattern);
}

function patternFromShape(local: string): EmailPattern | null {
  const separated = /^([a-z]+)([._-])([a-z]+)$/.exec(local);
  if (!separated) return null;
  const [, head = "", separator, tail = ""] = separated;
  if (separator === "_") return "first_last";
  if (separator === "-") return "first-last";
  if (head.length === 1) return "f.last";
  return tail.length === 1 ? "first.l" : "first.last";
}

/**
 * Format dominant parmi les adresses nominatives publiées du domaine. Une correspondance avec le nom d'une personne
 * connue vaut deux voix ; la forme seule (`a.b`, `a_b`) vaut une voix. Une adresse sans séparateur ni nom connu ne vote pas.
 */
export function inferFormat(personalAddresses: readonly string[], knownNames: readonly NameParts[]): InferredFormat | null {
  const votes = new Map<EmailPattern, { weight: number; evidence: string[]; named: boolean }>();
  const vote = (pattern: EmailPattern, address: string, weight: number) => {
    const entry = votes.get(pattern) ?? { weight: 0, evidence: [], named: false };
    entry.weight += weight;
    entry.named ||= weight > 1;
    entry.evidence.push(address);
    votes.set(pattern, entry);
  };
  for (const address of new Set(personalAddresses)) {
    const local = address.slice(0, address.lastIndexOf("@"));
    const named = new Set(knownNames.flatMap((name) => matchingPatterns(local, name)));
    for (const pattern of named) vote(pattern, address, 2);
    const shaped = named.size ? null : patternFromShape(local);
    if (shaped) vote(shaped, address, 1);
  }
  let best: [EmailPattern, { weight: number; evidence: string[]; named: boolean }] | undefined;
  for (const entry of votes) if (!best || entry[1].weight > best[1].weight) best = entry;
  return best ? { pattern: best[0], evidence: best[1].evidence, basis: best[1].named ? "name_match" : "shape" } : null;
}
