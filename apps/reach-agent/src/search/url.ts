import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

/** Clé de dédoublonnage : hôte en minuscules sans `www.`, sans fragment, sans `utm_*`, sans `/` final. */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "");
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, "");
}

// Deux listes séparées : une BlockList qui contient `::ffff:0:0/96` matcherait aussi toutes les IPv4.
const PRIVATE_IPV4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
] as const) {
  PRIVATE_IPV4.addSubnet(network, prefix, "ipv4");
}
// Les plages IPv6 qui embarquent une IPv4 (mappée, NAT64, 6to4) sont bloquées en entier : l'IPv4 cachée pourrait être privée.
const PRIVATE_IPV6 = new BlockList();
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  PRIVATE_IPV6.addSubnet(network, prefix, "ipv6");
}

const LOCAL_SUFFIXES = [".localhost", ".local", ".internal"];

function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return PRIVATE_IPV4.check(address, "ipv4");
  return family !== 6 || PRIVATE_IPV6.check(address, "ipv6");
}

export class BlockedHostError extends Error {
  constructor() {
    super("blocked host");
  }
}

export interface PublicTarget {
  url: URL;
  /** Adresse validée, à réutiliser pour la connexion (pas de seconde résolution DNS → pas de DNS rebinding). */
  address: string;
  family: 4 | 6;
}

/**
 * Refuse les schémas non http(s), les noms locaux et toute adresse privée, loopback ou réservée,
 * y compris quand un nom public résout vers une IP privée. Rend l'adresse validée à épingler.
 */
export async function resolvePublicTarget(raw: string): Promise<PublicTarget> {
  if (!URL.canParse(raw)) throw new BlockedHostError();
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedHostError();
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw new BlockedHostError();
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true });
  const [first] = addresses;
  if (!first || addresses.some(({ address }) => isPrivateAddress(address))) throw new BlockedHostError();
  return { url, address: first.address, family: first.family === 6 ? 6 : 4 };
}
