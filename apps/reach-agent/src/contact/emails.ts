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
  "contact", "direction", "hello", "bonjour", "info", "infos", "office", "team", "partners", "partenariats", "press", "presse",
];
// Adresses de rôle inutilisables pour une prise de contact commerciale.
const UNUSABLE = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply", "privacy", "dpo", "rgpd", "gdpr", "abuse", "postmaster",
  "webmaster", "hostmaster", "mailer-daemon", "unsubscribe", "bounce", "jobs", "careers", "recrutement", "rh", "hr",
  "support", "billing", "facturation", "compta", "comptabilite", "legal", "admin", "security",
]);
// Messageries grand public : jamais un domaine de courrier d'entreprise (fréquentes dans les commits GitHub).
const FREE_MAIL = /^(?:gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|gmx|web|protonmail|proton|pm|yandex|mail|zoho|free|orange|laposte|wanadoo|sfr)\.[a-z.]+$/;
// Noms de machine (`device-129.home`) laissés par une config git locale.
const LOCAL_HOST = /\.(?:home|local|lan|localdomain|internal)$/;
const MIN_TRUSTED_ADDRESSES = 2;

/** Domaines de courrier prouvés par des adresses d'une source fiable : au moins 2 adresses, ni webmail ni nom de machine. */
export function trustedMailDomains(emails: readonly FoundEmail[]): string[] {
  const counts: Record<string, number> = {};
  for (const address of new Set(emails.map((email) => email.address))) {
    const domain = emailDomain(address);
    if (!FREE_MAIL.test(domain) && !LOCAL_HOST.test(domain)) counts[domain] = (counts[domain] ?? 0) + 1;
  }
  return Object.keys(counts).filter((domain) => counts[domain]! >= MIN_TRUSTED_ADDRESSES);
}

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

export function emailDomain(address: string): string {
  return address.slice(address.lastIndexOf("@") + 1);
}

export function belongsTo(address: string, domains: readonly string[]): boolean {
  return domains.some((domain) => hostMatches(emailDomain(address), domain));
}

/** Adresse nominative probable : d'un des domaines, ni générique ni technique. */
export function isPersonal(address: string, domains: readonly string[]): boolean {
  const local = localPart(address);
  return belongsTo(address, domains) && !GENERIC_CONTACTS.includes(local) && !UNUSABLE.has(local);
}

/** Nom de marque d'un domaine : son plus long libellé hors TLD, sans tirets (`laro-nc.eu` → `laronc`). */
function brand(domain: string): string {
  const labels = domain.split(".").slice(0, -1).map((label) => label.replace(/-/g, ""));
  return labels.reduce((longest, label) => (label.length > longest.length ? label : longest), "");
}

const MIN_BRAND_LENGTH = 4;

function sharesBrand(a: string, b: string): boolean {
  return a.length >= MIN_BRAND_LENGTH && b.length >= MIN_BRAND_LENGTH && (a.includes(b) || b.includes(a));
}

/**
 * Domaines de courrier de l'entreprise, le plus probable en tête : celui du site et ceux des adresses publiées sur ses
 * pages qui partagent sa marque (`laro-nc.eu` → `laro-nc.de`, `dinoxsa.com` → `dinoxsavisalp.fr`). Les autres domaines
 * (hébergeur, agence web, webmail cités dans les mentions légales) sont écartés. `companyKey` : nom sans forme juridique.
 * `trusted` : domaines prouvés par une autre source (commits de l'organisation officielle), gardés même sans la marque.
 */
export function companyMailDomains(emails: readonly FoundEmail[], siteDomain: string, companyKey: string, trusted: readonly string[] = []): string[] {
  const siteBrand = brand(siteDomain);
  const company = companyKey.replace(/[\s-]/g, "");
  const stats = new Map<string, { personal: number; total: number }>([[siteDomain, { personal: 0, total: 0 }]]);
  for (const { address } of emails) {
    const domain = hostMatches(emailDomain(address), siteDomain) ? siteDomain : emailDomain(address);
    if (domain !== siteDomain && !trusted.includes(domain) && !sharesBrand(brand(domain), siteBrand) && !sharesBrand(brand(domain), company)) continue;
    const entry = stats.get(domain) ?? { personal: 0, total: 0 };
    entry.total++;
    if (isPersonal(address, [domain])) entry.personal++;
    stats.set(domain, entry);
  }
  // Tri stable : à égalité, le domaine du site (inséré en premier) reste devant.
  return [...stats].sort(([, a], [, b]) => b.personal - a.personal || b.total - a.total).map(([domain]) => domain);
}

/** Adresses génériques des domaines utiles pour un premier contact, par ordre de préférence (3 au plus). */
export function genericContacts(emails: readonly FoundEmail[], domains: readonly string[]): FoundEmail[] {
  const byAddress = new Map<string, FoundEmail>();
  for (const email of emails) {
    if (belongsTo(email.address, domains) && GENERIC_CONTACTS.includes(localPart(email.address)) && !byAddress.has(email.address)) {
      byAddress.set(email.address, email);
    }
  }
  const rank = (email: FoundEmail) => GENERIC_CONTACTS.indexOf(localPart(email.address));
  return [...byAddress.values()].sort((a, b) => rank(a) - rank(b)).slice(0, 3);
}
