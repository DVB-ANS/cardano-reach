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

const PRIVATE_RANGES = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  PRIVATE_RANGES.addSubnet(network, prefix, "ipv6");
}

const IPV4_MAPPED = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
const LOCAL_SUFFIXES = [".localhost", ".local", ".internal"];

function isPrivateAddress(address: string): boolean {
  const mapped = IPV4_MAPPED.exec(address)?.[1];
  if (mapped) return PRIVATE_RANGES.check(mapped, "ipv4");
  const family = isIP(address);
  return family === 0 || PRIVATE_RANGES.check(address, family === 4 ? "ipv4" : "ipv6");
}

export class BlockedHostError extends Error {
  constructor() {
    super("blocked host");
  }
}

/**
 * Refuse les schémas non http(s), les noms locaux et toute adresse privée ou loopback,
 * y compris quand un nom public résout vers une IP privée.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  if (!URL.canParse(raw)) throw new BlockedHostError();
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new BlockedHostError();
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) throw new BlockedHostError();
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new BlockedHostError();
    return url;
  }
  const addresses = await lookup(host, { all: true });
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new BlockedHostError();
  return url;
}
