// Le domaine reçoit-il du courrier ? DNS seulement (MX, MX nul RFC 7505, repli A/AAAA RFC 5321) : aucune connexion SMTP.
import { Resolver } from "node:dns/promises";

export type MxStatus = "valid" | "implicit" | "null_mx" | "none" | "error";

export interface MailDomainCheck {
  domain: string;
  /** `valid` : MX publiés ; `implicit` : pas de MX mais une adresse A/AAAA (livraison possible) ; `null_mx` : refuse tout courrier. */
  mx: MxStatus;
  hosts: string[];
  error?: string;
}

export interface MailDns {
  resolveMx(domain: string): Promise<Array<{ exchange: string; priority: number }>>;
  /** Ne rejette jamais : aucune adresse → `[]`. */
  resolveAddresses(domain: string): Promise<string[]>;
}

const DNS_TIMEOUT_MS = 3_000;

/** Un résolveur par appel : `cancel()` sur l'échéance n'interrompt que ses propres requêtes. */
export function systemDns(signal: AbortSignal): MailDns {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 2 });
  signal.addEventListener("abort", () => resolver.cancel(), { once: true });
  return {
    resolveMx: (domain) => resolver.resolveMx(domain),
    async resolveAddresses(domain) {
      const [v4, v6] = await Promise.allSettled([resolver.resolve4(domain), resolver.resolve6(domain)]);
      return [...(v4.status === "fulfilled" ? v4.value : []), ...(v6.status === "fulfilled" ? v6.value : [])];
    },
  };
}

function dnsCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : String(error);
}

export async function checkMailDomain(domain: string, dns: MailDns): Promise<MailDomainCheck> {
  const result = (mx: MxStatus, hosts: string[] = [], error?: string): MailDomainCheck => ({ domain, mx, hosts, ...(error ? { error } : {}) });
  let records: Array<{ exchange: string; priority: number }>;
  try {
    records = await dns.resolveMx(domain);
  } catch (error) {
    const code = dnsCode(error);
    if (code === "ENOTFOUND") return result("none", [], "domaine inexistant");
    if (code !== "ENODATA") return result("error", [], code);
    records = [];
  }
  const hosts = records.toSorted((a, b) => a.priority - b.priority).map((record) => record.exchange.replace(/\.$/, ""));
  if (hosts.length) return hosts.every((host) => host === "") ? result("null_mx") : result("valid", hosts);
  return (await dns.resolveAddresses(domain)).length ? result("implicit") : result("none");
}
