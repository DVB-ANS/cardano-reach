const DAY_MS = 86_400_000;
const COMPACT_DATE = /^(\d{4})(\d{2})(\d{2})$/;

/** Convertit une date lue dans une source en ISO 8601 ; `null` si absente ou illisible. */
export function toIsoDate(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value || value === "N/A") return null;
  const compact = COMPACT_DATE.exec(value);
  const time = Date.parse(compact ? `${compact[1]}-${compact[2]}-${compact[3]}T00:00:00Z` : value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** Les hits sans date sont gardés : ils ne sont simplement pas des signaux récents. */
export function isFresh(publishedAt: string | null, freshnessDays: number | undefined, now: number): boolean {
  if (publishedAt === null || freshnessDays === undefined) return true;
  return Date.parse(publishedAt) >= now - freshnessDays * DAY_MS;
}
