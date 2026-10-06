import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ModelMessage } from "ai";
import type { ExaResponse, ExaResult } from "../search/exa.ts";
import type { PageResult } from "../search/pages.ts";
import { companyMailDomains, extractEmails, genericContacts } from "./emails.ts";
import { decideEmail, findContact, runFindContact, type ContactDeps } from "./find-contact.ts";
import { checkMailDomain, type MailDns, type MailDomainCheck } from "./mail-domain.ts";
import { linkedinProfilesRequest, parseProfileTitle, peopleSearchRequest, toCandidates } from "./people.ts";
import { isReadBlocked } from "./platforms.ts";
import { emailVariants, inferFormat, splitName, type NameParts } from "./variants.ts";

const JANE: NameParts = { first: "jane", last: "doe" };
const VALID_MX: MailDomainCheck = { domain: "acme.fr", mx: "valid", hosts: ["mx.acme.fr"] };

const exaResult = (url: string, title: string, highlights: string[] = []): ExaResult => ({ url, title, publishedDate: null, highlights, text: null });
const page = (url: string, text: string): PageResult => ({ url, ok: true, title: null, publishedAt: null, text });
const dnsError = (code: string) => Object.assign(new Error(code), { code });

function mockDns(overrides: Partial<MailDns> = {}): MailDns {
  return { resolveMx: async () => [{ exchange: "mx.acme.fr", priority: 10 }], resolveAddresses: async () => [], ...overrides };
}

describe("email extraction", () => {
  it("reads plain, obfuscated and entity-encoded addresses, skips image names", () => {
    const text = "Écrire à Jane.Doe@Acme.fr ou achats [at] acme (dot) fr, presse&#64;acme.fr. Logo : logo@2x.png. jane.doe@acme.fr";
    assert.deepEqual(extractEmails(text), ["jane.doe@acme.fr", "achats@acme.fr", "presse@acme.fr"]);
  });

  it("keeps only useful generic addresses of the domain, by preference", () => {
    const found = ["contact@acme.fr", "noreply@acme.fr", "sales@acme.fr", "sales@other.com", "dpo@acme.fr"].map((address) => ({ address, sourceUrl: "https://acme.fr/contact" }));
    assert.deepEqual(genericContacts(found, ["acme.fr"]).map((email) => email.address), ["sales@acme.fr", "contact@acme.fr"]);
  });
});

describe("variants and format", () => {
  it("normalizes names (accents, honorifics, particles)", () => {
    assert.deepEqual(splitName("Dr. Hélène de La Tour"), { first: "helene", last: "delatour" });
    assert.deepEqual(splitName("Jean-Pierre Dupont"), { first: "jean-pierre", last: "dupont" });
    assert.equal(splitName("Madonna"), null);
  });

  it("generates the usual variants without duplicates", () => {
    const locals = emailVariants(JANE).map((variant) => variant.local);
    assert.deepEqual(locals.slice(0, 5), ["jane.doe", "jdoe", "jane", "janedoe", "j.doe"]);
    assert.equal(new Set(locals).size, locals.length);
  });

  it("infers the format from published addresses matching known names", () => {
    const format = inferFormat(["jsmith@acme.fr", "pmartin@acme.fr", "x.y@acme.fr"], [{ first: "john", last: "smith" }, { first: "paul", last: "martin" }]);
    assert.equal(format?.pattern, "flast");
    assert.equal(format?.basis, "name_match");
    assert.deepEqual(format?.evidence, ["jsmith@acme.fr", "pmartin@acme.fr"]);
  });

  it("falls back on the shape, ignores unnamed single tokens", () => {
    assert.equal(inferFormat(["paul.martin@acme.fr"], [])?.basis, "shape");
    assert.equal(inferFormat(["paul.martin@acme.fr"], [])?.pattern, "first.last");
    assert.equal(inferFormat(["jsmith@acme.fr"], []), null);
  });
});

describe("email status", () => {
  const source = "https://acme.fr/equipe";
  const emails = (...addresses: string[]) => addresses.map((address) => ({ address, sourceUrl: source }));

  it("published: the person's own address read on a page", () => {
    assert.deepEqual(decideEmail({ person: JANE, domains: ["acme.fr"], emails: emails("contact@acme.fr", "jdoe@acme.fr"), knownNames: [], mail: VALID_MX }), {
      status: "published",
      address: "jdoe@acme.fr",
      sourceUrl: source,
    });
  });

  it("guessed: format deduced from colleagues, with its evidence", () => {
    const finding = decideEmail({ person: JANE, domains: ["acme.fr"], emails: emails("psmith@acme.fr"), knownNames: [{ first: "paul", last: "smith" }], mail: VALID_MX });
    assert.equal(finding.status, "guessed");
    if (finding.status !== "guessed") return;
    assert.equal(finding.address, "jdoe@acme.fr");
    assert.equal(finding.basis, "published_format");
    assert.equal(finding.confidence, "medium");
    assert.deepEqual(finding.evidence, emails("psmith@acme.fr"));
    assert.ok(!finding.alternatives.includes("jdoe@acme.fr"));
  });

  it("guessed with the default pattern when nothing is published", () => {
    const finding = decideEmail({ person: JANE, domains: ["acme.fr"], emails: [], knownNames: [], mail: null });
    assert.equal(finding.status === "guessed" && finding.basis, "default_pattern");
    assert.equal(finding.status === "guessed" && finding.confidence, "low");
    assert.equal(finding.status === "guessed" && finding.address, "jane.doe@acme.fr");
  });

  it("not_found: no person, or a domain that receives no mail; generic address kept", () => {
    const noPerson = decideEmail({ person: null, domains: ["acme.fr"], emails: emails("contact@acme.fr"), knownNames: [], mail: VALID_MX });
    assert.deepEqual(noPerson, { status: "not_found", reason: "personne non identifiée", generic: { address: "contact@acme.fr", sourceUrl: source } });
    const nullMx = decideEmail({ person: JANE, domains: ["acme.fr"], emails: [], knownNames: [], mail: { ...VALID_MX, mx: "null_mx", hosts: [] } });
    assert.equal(nullMx.status, "not_found");
  });
});

describe("mail domain (DNS mocked, no SMTP)", () => {
  it("sorts MX by priority", async () => {
    const dns = mockDns({ resolveMx: async () => [{ exchange: "b.acme.fr", priority: 20 }, { exchange: "a.acme.fr.", priority: 5 }] });
    const check = await checkMailDomain("acme.fr", dns);
    assert.deepEqual([check.mx, check.hosts], ["valid", ["a.acme.fr", "b.acme.fr"]]);
    assert.ok(!("catchAll" in check));
  });

  it("detects null MX, implicit MX, missing domain and DNS errors", async () => {
    assert.equal((await checkMailDomain("acme.fr", mockDns({ resolveMx: async () => [{ exchange: "", priority: 0 }] }))).mx, "null_mx");
    const noMx = mockDns({ resolveMx: () => Promise.reject(dnsError("ENODATA")), resolveAddresses: async () => ["203.0.113.7"] });
    assert.equal((await checkMailDomain("acme.fr", noMx)).mx, "implicit");
    assert.equal((await checkMailDomain("acme.fr", mockDns({ resolveMx: () => Promise.reject(dnsError("ENOTFOUND")) }))).mx, "none");
    const timeout = await checkMailDomain("acme.fr", mockDns({ resolveMx: () => Promise.reject(dnsError("ETIMEOUT")) }));
    assert.deepEqual([timeout.mx, timeout.error], ["error", "ETIMEOUT"]);
  });
});

describe("people and platforms", () => {
  it("blocks reading of freelance platforms, subdomains included", () => {
    for (const url of ["https://www.malt.fr/profile/x", "https://malt.com/x", "https://www.upwork.com/freelancers/~1", "https://fr.fiverr.com/x", "https://www.codeur.com/-x"]) {
      assert.ok(isReadBlocked(url), url);
    }
    assert.ok(!isReadBlocked("https://notmalt.fr/"));
  });

  it("never sends date filters or excludeDomains with category people", () => {
    const body = peopleSearchRequest("Head of Procurement", "Acme");
    assert.equal(body.category, "people");
    for (const key of ["startPublishedDate", "endPublishedDate", "excludeDomains"]) assert.ok(!(key in body), key);
    assert.match(String(linkedinProfilesRequest("CTO", "Acme").query), /^site:linkedin\.com\/in "CTO" "Acme"$/);
  });

  it("parses profile titles and sets platform profiles apart", () => {
    assert.deepEqual(parseProfileTitle("Jane Doe - Head of Procurement - Acme SAS | LinkedIn"), { name: "Jane Doe", headline: "Head of Procurement · Acme SAS" });
    assert.equal(parseProfileTitle("Top 10 procurement leaders in 2026 - Blog"), null);
    const { people, platformProfiles } = toCandidates(
      [
        exaResult("https://fr.linkedin.com/in/janedoe", "Jane Doe - Head of Procurement - Acme | LinkedIn"),
        exaResult("https://www.linkedin.com/in/bob", "Bob Martin - Buyer - Other Corp"),
        exaResult("https://www.malt.fr/profile/jdupont", "Jean Dupont - Développeur Aiken"),
      ],
      "Acme SAS",
      "Head of Procurement",
    );
    assert.deepEqual(people.map((person) => [person.name, person.companyMatch, person.roleMatch]), [["Jane Doe", true, true], ["Bob Martin", false, false]]);
    assert.deepEqual(platformProfiles, [{ url: "https://www.malt.fr/profile/jdupont", title: "Jean Dupont - Développeur Aiken", contact: "contact via la plateforme" }]);
  });
});

describe("findContact (mocked Exa, pages and DNS)", () => {
  const response = (results: ExaResult[]): ExaResponse => ({ results, statuses: [] });

  function deps(overrides: Partial<ContactDeps> = {}): ContactDeps & { readUrls: string[] } {
    const readUrls: string[] = [];
    return {
      readUrls,
      async exaSearch(body) {
        if (body.category === "people") return response([exaResult("https://www.linkedin.com/in/janedoe", "Jane Doe - Head of Procurement - Acme")]);
        if (Array.isArray(body.includeDomains) && body.includeDomains.includes("acme.fr")) {
          return response([exaResult("https://www.acme.fr/presse/nomination", "Nomination"), exaResult("https://www.malt.fr/profile/x", "x")]);
        }
        return response([exaResult("https://www.malt.fr/profile/jdupont", "Jean Dupont - Freelance")]);
      },
      async readPages(urls) {
        readUrls.push(...urls);
        return urls.map((url) =>
          url.endsWith("/presse/nomination")
            ? page(url, "Jane Doe est nommée Head of Procurement. Contact presse : p.martin@acme.fr")
            : url.endsWith("/contact")
              ? page(url, "Écrivez à achats@acme.fr")
              : { url, ok: false, title: null, publishedAt: null, text: "", error: "HTTP 404" },
        );
      },
      dns: () => mockDns(),
      ...overrides,
    };
  }

  it("finds the person on an official page, guesses the email, never reads platforms or LinkedIn", async () => {
    const mocks = deps();
    const result = await findContact({ company: "Acme", domain: "https://www.acme.fr/", role: "Head of Procurement" }, { signal: new AbortController().signal, deps: mocks });
    assert.equal(result.domain, "acme.fr");
    assert.deepEqual(result.person && [result.person.name, result.person.proofKind, result.person.proofUrl, result.person.roleStatus], [
      "Jane Doe",
      "official_page",
      "https://www.acme.fr/presse/nomination",
      "rôle confirmé",
    ]);
    assert.equal(result.email.status, "guessed");
    assert.equal(result.email.status === "guessed" && result.email.address, "j.doe@acme.fr");
    assert.deepEqual(result.genericEmails, [{ address: "achats@acme.fr", sourceUrl: "https://acme.fr/contact" }]);
    assert.ok(mocks.readUrls.every((url) => !isReadBlocked(url) && !url.includes("linkedin.com")));
    assert.deepEqual(result.platformProfiles.map((profile) => profile.url), ["https://www.malt.fr/profile/jdupont"]);
    assert.deepEqual(result.failures, []);
  });

  it("passes readPages an integer deadline (AbortSignal.timeout rejects fractions)", async () => {
    const deadlines: number[] = [];
    const base = deps();
    const strict: ContactDeps["readPages"] = async (urls, options) => {
      deadlines.push(options.deadlineMs);
      AbortSignal.timeout(options.deadlineMs);
      return base.readPages(urls, options);
    };
    const result = await findContact({ company: "Acme", domain: "acme.fr", role: "Head of Procurement" }, { signal: new AbortController().signal, deps: { ...base, readPages: strict } });
    assert.equal(deadlines.length, 2);
    assert.ok(deadlines.every(Number.isInteger), String(deadlines));
    assert.ok(result.pagesRead.length > 0);
    assert.ok(!result.failures.some((failure) => failure.step === "read_pages"));
  });

  it("marks a person whose profile title does not match the role", async () => {
    const result = await findContact({ company: "Acme", domain: "acme.fr", role: "Directeur technique" }, { signal: new AbortController().signal, deps: deps() });
    assert.equal(result.person?.name, "Jane Doe");
    assert.equal(result.person?.roleStatus, "rôle non confirmé");
  });

  it("lists failures instead of throwing, and respects the deadline", async () => {
    const hanging: ContactDeps["exaSearch"] = (_body, signal) =>
      new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true }));
    const result = await findContact({ company: "Acme", domain: "acme.fr", role: "CTO" }, { signal: new AbortController().signal, deadlineMs: 100, deps: deps({ exaSearch: hanging }) });
    assert.equal(result.person, null);
    assert.equal(result.email.status, "not_found");
    assert.deepEqual(
      result.failures.filter((failure) => failure.step !== "read_pages"),
      ["exa_people", "linkedin_profiles", "official_pages_search"].map((step) => ({ step, reason: "timeout" })),
    );
  });

  it("refuses to read a freelance platform given as company domain", async () => {
    const mocks = deps({ exaSearch: () => assert.fail("no search"), dns: () => assert.fail("no dns") });
    const result = await findContact({ company: "Jean Dupont", domain: "www.malt.fr", role: "dev Aiken" }, { signal: new AbortController().signal, deps: mocks });
    assert.equal(result.email.status, "not_found");
    assert.equal(result.platformProfiles[0]?.contact, "contact via la plateforme");
    assert.deepEqual(mocks.readUrls, []);
  });

  it("is refused in PHASE: INTAKE before any call", async () => {
    const messages: ModelMessage[] = [{ role: "user", content: "PHASE: INTAKE\n\nTrouve le responsable achats d'Acme." }];
    const mocks = deps({ exaSearch: () => assert.fail("no search") });
    await assert.rejects(runFindContact(messages, { company: "Acme", domain: "acme.fr", role: "achats" }, { signal: new AbortController().signal, deps: mocks }), /INTAKE/);
    assert.deepEqual(mocks.readUrls, []);
  });
});

describe("mail domain differing from the site (published on official pages)", () => {
  const contactPage = (domain: string) => `https://${domain}/contact`;

  function siteDeps(domain: string, contactText: string, profileTitle: string | null): ContactDeps & { mxDomains: string[] } {
    const mxDomains: string[] = [];
    return {
      mxDomains,
      exaSearch: async (body) => ({
        results: body.category === "people" && profileTitle ? [exaResult("https://www.linkedin.com/in/x", profileTitle)] : [],
        statuses: [],
      }),
      readPages: async (urls) =>
        urls.map((url) => (url === contactPage(domain) ? page(url, contactText) : { url, ok: false, title: null, publishedAt: null, text: "", error: "HTTP 404" })),
      dns: () => ({
        resolveMx: async (mailDomain) => {
          mxDomains.push(mailDomain);
          return [{ exchange: `mx.${mailDomain}`, priority: 10 }];
        },
        resolveAddresses: async () => [],
      }),
    };
  }

  it("keeps branded mail domains, drops hosting and webmail addresses", () => {
    const found = (...addresses: string[]) => addresses.map((address) => ({ address, sourceUrl: "https://laro-nc.eu/impressum" }));
    assert.deepEqual(companyMailDomains(found("info@laro-nc.de", "support@ovh.com", "x@gmail.com"), "laro-nc.eu", "laro"), ["laro-nc.de", "laro-nc.eu"]);
    assert.deepEqual(companyMailDomains(found("direction@dinoxsavisalp.fr"), "dinoxsa.com", "dinox"), ["dinoxsavisalp.fr", "dinoxsa.com"]);
    assert.deepEqual(companyMailDomains(found("contact@acme.fr", "info@acme-group.de"), "acme.fr", "acme"), ["acme.fr", "acme-group.de"]);
  });

  it("LARO (laro-nc.eu publishes info@laro-nc.de): generic kept with its page, guess on @laro-nc.de", async () => {
    const mocks = siteDeps("laro-nc.eu", "Kontakt : info@laro-nc.de — Hosting : support@ovh.com", "Jane Doe - Einkaufsleiterin - LARO NC");
    const result = await findContact({ company: "LARO NC GmbH", domain: "laro-nc.eu", role: "Einkaufsleiterin" }, { signal: new AbortController().signal, deps: mocks });
    assert.deepEqual(result.genericEmails, [{ address: "info@laro-nc.de", sourceUrl: contactPage("laro-nc.eu") }]);
    assert.equal(result.email.status, "guessed");
    assert.equal(result.email.status === "guessed" && result.email.address, "jane.doe@laro-nc.de");
    assert.deepEqual(mocks.mxDomains, ["laro-nc.de"]);
    assert.equal(result.mailDomain?.domain, "laro-nc.de");
  });

  it("DINOX (dinoxsa.com publishes on @dinoxsavisalp.fr): person's address published, generic otherwise", async () => {
    const text = "Direction : direction@dinoxsavisalp.fr. Achats : Jean Martin, jean.martin@dinoxsavisalp.fr";
    const found = await findContact({ company: "Dinox SA", domain: "dinoxsa.com", role: "Responsable achats" }, { signal: new AbortController().signal, deps: siteDeps("dinoxsa.com", text, "Jean Martin - Responsable achats - Dinox SA") });
    assert.deepEqual(found.email, { status: "published", address: "jean.martin@dinoxsavisalp.fr", sourceUrl: contactPage("dinoxsa.com") });
    const nobody = await findContact({ company: "Dinox SA", domain: "dinoxsa.com", role: "Responsable achats" }, { signal: new AbortController().signal, deps: siteDeps("dinoxsa.com", "Écrivez à direction@dinoxsavisalp.fr", null) });
    assert.deepEqual(nobody.email, { status: "not_found", reason: "personne non identifiée", generic: { address: "direction@dinoxsavisalp.fr", sourceUrl: contactPage("dinoxsa.com") } });
  });
});
