// Contrat partagé worker ↔ agent. TS pur, sans dépendance. Toute modification passe par une PR dédiée.

export const PHASES = ["INTAKE", "RESEARCH", "FOLLOWUP"] as const;
export type Phase = (typeof PHASES)[number];

export const MODES = ["sourcing", "leads"] as const;
export type Mode = (typeof MODES)[number];

export const NICHES = ["crypto-defi", "automobile", "aero-spatial", "saas-tech-b2b", "other"] as const;
export type Niche = (typeof NICHES)[number];

export const LANGUAGES = ["fr", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export interface Brief {
  mode: Mode;
  niche: Niche;
  need: string;
  zone: string | null;
  volume: string | null;
  constraints: string[];
  language: Language;
  assumptions: string[];
}

export const MAX_REPORT_BYTES = 900_000;
export const MAX_NEED_LENGTH = 2000;

export function phaseMessage(phase: Phase, body: string): string {
  return `PHASE: ${phase}\n\n${body}`;
}

function invalid(field: string): Error {
  return new Error(`Invalid brief: ${field}`);
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (values as readonly string[]).includes(value);
}

function nullableString(value: unknown, field: string): string | null {
  if (value === null || typeof value === "string") return value;
  throw invalid(field);
}

function stringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw invalid(field);
  return value;
}

export function parseBrief(value: unknown): Brief {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid("root");
  const raw = value as Record<string, unknown>;
  if (!isOneOf(MODES, raw.mode)) throw invalid("mode");
  if (!isOneOf(NICHES, raw.niche)) throw invalid("niche");
  if (typeof raw.need !== "string" || !raw.need.trim() || raw.need.length > MAX_NEED_LENGTH) throw invalid("need");
  if (!isOneOf(LANGUAGES, raw.language)) throw invalid("language");
  return {
    mode: raw.mode,
    niche: raw.niche,
    need: raw.need,
    zone: nullableString(raw.zone, "zone"),
    volume: nullableString(raw.volume, "volume"),
    constraints: stringArray(raw.constraints, "constraints"),
    language: raw.language,
    assumptions: stringArray(raw.assumptions, "assumptions"),
  };
}

const JSON_BLOCK = /```json[^\S\n]*\n([\s\S]*?)```/g;

export function extractBrief(message: string): Brief {
  const blocks = [...message.matchAll(JSON_BLOCK)];
  const last = blocks.at(-1)?.[1];
  if (last === undefined) throw new Error("No brief block");
  let parsed: unknown;
  try {
    parsed = JSON.parse(last);
  } catch (error) {
    throw new Error("Invalid brief: json", { cause: error });
  }
  return parseBrief(parsed);
}
