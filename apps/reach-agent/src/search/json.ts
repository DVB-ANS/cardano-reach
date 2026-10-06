// Garde canonique du moteur pour les sorties JSON externes (CLI, API). Les champs restent `unknown` : chaque parseur
// vérifie ceux qu'il lit avec `typeof` / `Array.isArray`.

export type JsonRecord = Record<string, unknown>;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
