// Adresses e-mail lues dans le texte des pages : extraction (y compris `[at]` / `(dot)`), tri personnelles / génériques.
import { hostMatches } from "./text.ts";

export interface FoundEmail {
  address: string;
  sourceUrl: string;
}

const EMAIL = /[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@(?:[a-z0-9-]+\.)+[a-z]{2,24}/gi;
const OBFUSCATED_AT = /\s*[[({]\s*(?:at|arobase)\s*[\])}]\s*/gi;
const OBFUSCATED_DOT = /\s*[[({]\s*(?:dot|point)\s*[\])}]\s*/gi;
// `logo@2x.png` a la forme d'une adresse.
const FILE_SUFFIX = /\.(?:png|jpe?g|gif|svg|webp|avif|css|js)$/;

// Ordre = préférence quand aucune adresse personnelle n'est trouvée.
const GENERIC_CONTACTS = [
  "sales", "ventes", "commercial", "business", "achats", "purchasing", "procurement",
  "contact", "hello", "bonjour", "info", "infos", "office", "team", "partners", "partenariats", "press", "presse",
];
// Adresses de rôle inutilisables pour une prise de contact commerciale.
const UNUSABLE = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply", "privacy", "dpo", "rgpd", "gdpr", "abuse", "postmaster",
  "webmaster", "hostmaster", "mailer-daemon", "unsubscribe", "bounce", "jobs", "careers", "recrutement", "rh", "hr",
  "support", "billing", "facturation", "compta", "comptabilite", "legal", "admin", "security",
]);

export function extractEmails(text: string): string[] {
  const plain = text.replace(/&#0*64;|&#x0*40;/gi, "@").replace(OBFUSCATED_AT, "@").replace(OBFUSCATED_DOT, ".");
  const found = new Set<string>();
  for (const match of plain.matchAll(EMAIL)) {
    const address = match[0].toLowerCase();
    if (!FILE_SUFFIX.test(address)) found.add(address);
  }
  return [...found];
}

export function localPart(address: string): string {
  return address.slice(0, address.lastIndexOf("@"));
}

export function belongsTo(address: string, domain: string): boolean {
  return hostMatches(address.slice(address.lastIndexOf("@") + 1), domain);
}

/** Adresse nominative probable : du domaine, ni générique ni technique. */
export function isPersonal(address: string, domain: string): boolean {
  const local = localPart(address);
  return belongsTo(address, domain) && !GENERIC_CONTACTS.includes(local) && !UNUSABLE.has(local);
}

/** Adresses génériques du domaine utiles pour un premier contact, par ordre de préférence (3 au plus). */
export function genericContacts(emails: readonly FoundEmail[], domain: string): FoundEmail[] {
  const byAddress = new Map<string, FoundEmail>();
  for (const email of emails) {
    if (belongsTo(email.address, domain) && GENERIC_CONTACTS.includes(localPart(email.address)) && !byAddress.has(email.address)) {
      byAddress.set(email.address, email);
    }
  }
  const rank = (email: FoundEmail) => GENERIC_CONTACTS.indexOf(localPart(email.address));
  return [...byAddress.values()].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}
