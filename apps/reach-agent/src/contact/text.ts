/** Minuscules sans accents : comparaison de noms, rôles et entreprises indépendante de la graphie. */
export function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** `https://www.Acme.fr/x` ou `Acme.fr` → `acme.fr`. */
export function bareDomain(raw: string): string {
  const host = URL.canParse(raw) ? new URL(raw).hostname : raw.trim().replace(/\/.*$/, "");
  return host.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
}

/** Vrai si `host` est `domain` ou l'un de ses sous-domaines. */
export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}
