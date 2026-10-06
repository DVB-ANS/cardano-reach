// Plateformes freelance dont les CGU interdisent la collecte automatisée et le contournement (docs/research/phase5.md §2) :
// jamais lues (ni `read_pages`, ni Exa `/contents`), seulement l'URL renvoyée par le moteur et un contact sur la plateforme.
import { hostMatches } from "./text.ts";

export const READ_BLOCKED_DOMAINS = ["malt.fr", "malt.com", "upwork.com", "fiverr.com", "codeur.com"] as const;
export const PLATFORM_CONTACT = "contact via la plateforme";

export function isReadBlocked(url: string): boolean {
  if (!URL.canParse(url)) return false;
  const host = new URL(url).hostname.toLowerCase();
  return READ_BLOCKED_DOMAINS.some((domain) => hostMatches(host, domain));
}
