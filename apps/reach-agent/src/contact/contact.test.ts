import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ModelMessage } from "ai";
import type { ExaResponse, ExaResult } from "../search/exa.ts";
import type { PageResult } from "../search/pages.ts";
import { companyMailDomains, extractEmails, genericContacts } from "./emails.ts";
import { decideEmail, findContact, runFindContact, type ContactDeps } from "./find-contact.ts";
import { checkMailDomain, type MailDns, type MailDomainCheck } from "./mail-domain.ts";
import { githubCommitEmails } from "./github.ts";
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

  // Réponses réelles d'Exa `category: "people"` (2026-10-07) : le titre ne porte que le nom, le poste est dans les extraits.
  it("confirms the role from the profile headline or a current-position line, never from a past position", () => {
    const { people } = toCandidates(
      [
        exaResult("https://www.linkedin.com/in/aaronrutter", "Aaron Rutter", ["Vice President of Sales at LISI AEROSPACE NORTH AMERICA\n...\nVice President"]),
        exaResult("https://www.linkedin.com/in/tombailey", "Tom Bailey", ["### [Didomi](https://www.linkedin.com/company/didomi)\n\n#### SVP Global Sales (Current)\n\nMay 2026 - Present"]),
        exaResult("https://www.linkedin.com/in/olduser", "Old Seller", ["Product Designer at Acme\n...\n### Head of Sales - [Acme](https://x) (2015 - 2019)"]),
      ],
      "Lisi Aerospace",
      "Head of Sales",
    );
    assert.deepEqual(people.map((person) => [person.name, person.roleMatch]), [["Aaron Rutter", true], ["Tom Bailey", true], ["Old Seller", false]]);
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
      githubEmails: async () => [],
      gravatarExists: async () => false,
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
      ["exa_people", "linkedin_profiles", "official_pages_search", "domain_emails_web"].map((step) => ({ step, reason: "timeout" })),
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
      githubEmails: async () => [],
      gravatarExists: async () => false,
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

describe("GitHub commit emails (mocked API)", () => {
  const api: Record<string, unknown> = {
    "/search/users?q=Alan%20type%3Aorg&per_page=5": { items: [{ login: "alan-fake" }, { login: "alan-eu" }] },
    "/orgs/alan-fake": { blog: "https://alan-insurance.example" },
    "/orgs/alan-eu": { blog: "alan.com" },
    "/orgs/alan-eu/repos?sort=pushed&per_page=10": [
      { name: "fork", fork: true, archived: false },
      { name: "api", fork: false, archived: false },
    ],
    "/repos/alan-eu/api/commits?per_page=50": [
      { html_url: "https://github.com/alan-eu/api/commit/1", commit: { author: { email: "Jane.Doe@alan.eu" }, committer: { email: "noreply@github.com" } } },
      { html_url: "https://github.com/alan-eu/api/commit/2", commit: { author: { email: "1234+bob@users.noreply.github.com" }, committer: { email: "bot@alan.eu" } } },
      { html_url: "https://github.com/alan-eu/api/commit/3", commit: { author: { email: "jane.doe@alan.eu" }, committer: { email: "p.martin@alan.eu" } } },
    ],
  };
  const get = async (path: string) => {
    if (!(path in api)) throw new Error(`unexpected ${path}`);
    return api[path];
  };

  it("reads the org whose declared site is the company's, skips forks, noreply and duplicates", async () => {
    const emails = await githubCommitEmails("Alan", "alan.com", get, new AbortController().signal);
    assert.deepEqual(emails, [
      { address: "jane.doe@alan.eu", sourceUrl: "https://github.com/alan-eu/api/commit/1" },
      { address: "bot@alan.eu", sourceUrl: "https://github.com/alan-eu/api/commit/2" },
      { address: "p.martin@alan.eu", sourceUrl: "https://github.com/alan-eu/api/commit/3" },
    ]);
  });

  it("never reads an org whose declared site is another domain", async () => {
    assert.deepEqual(await githubCommitEmails("Alan", "unrelated.fr", get, new AbortController().signal), []);
  });

  it("guesses on the commit mail domain, even without the site's brand", async () => {
    const response = (results: ExaResult[]): ExaResponse => ({ results, statuses: [] });
    const result = await findContact(
      { company: "Blockfrost", domain: "blockfrost.io", role: "CEO" },
      {
        signal: new AbortController().signal,
        deps: {
          exaSearch: async (body) => response(body.category === "people" ? [exaResult("https://www.linkedin.com/in/jr", "John Roe", ["CEO at Blockfrost"])] : []),
          readPages: async (urls) => urls.map((url) => ({ url, ok: false, title: null, publishedAt: null, text: "", error: "HTTP 404" })),
          dns: () => mockDns(),
          githubEmails: async () => [
            { address: "anna.kowalski@iohk.io", sourceUrl: "https://github.com/blockfrost/x/commit/1" },
            { address: "tom.smith@iohk.io", sourceUrl: "https://github.com/blockfrost/x/commit/2" },
          ],
          gravatarExists: async () => false,
        },
      },
    );
    assert.equal(result.email.status, "guessed");
    assert.equal(result.email.status === "guessed" && result.email.address, "john.roe@iohk.io");
    assert.equal(result.email.status === "guessed" && result.email.basis, "published_shape");
  });
});

describe("commit domains (real shapes: Blockfrost commits are mostly @gmail.com)", () => {
  it("never trusts webmail or a lone vanity domain from commits", async () => {
    const response = (results: ExaResult[]): ExaResponse => ({ results, statuses: [] });
    const commit = (address: string) => ({ address, sourceUrl: "https://github.com/blockfrost/x/commit/1" });
    const result = await findContact(
      { company: "Blockfrost", domain: "blockfrost.io", role: "CEO" },
      {
        signal: new AbortController().signal,
        deps: {
          exaSearch: async (body) => response(body.category === "people" ? [exaResult("https://www.linkedin.com/in/jr", "John Roe", ["CEO at Blockfrost"])] : []),
          readPages: async (urls) => urls.map((url) => ({ url, ok: false, title: null, publishedAt: null, text: "", error: "HTTP 404" })),
          dns: () => mockDns(),
          githubEmails: async () => [commit("a.b@gmail.com"), commit("c.d@gmail.com"), commit("e.f@gmail.com"), commit("me@janeroe.dev"), commit("x.y@iohk.io")],
          gravatarExists: async () => false,
        },
      },
    );
    assert.equal(result.email.status === "guessed" && result.email.address, "john.roe@blockfrost.io");
  });
});

describe("public addresses of the domain on the web (Exa \"@domain\")", () => {
  it("learns the format from addresses published elsewhere on the web", async () => {
    const response = (results: ExaResult[]): ExaResponse => ({ results, statuses: [] });
    const result = await findContact(
      { company: "Acme", domain: "acme.fr", role: "Head of Procurement" },
      {
        signal: new AbortController().signal,
        deps: {
          exaSearch: async (body) => {
            if (body.category === "people") return response([exaResult("https://www.linkedin.com/in/janedoe", "Jane Doe", ["Head of Procurement at Acme"])]);
            if (String(body.query).includes("@acme.fr")) {
              return response([{ url: "https://annuaire.example/acme", title: "Acme", publishedDate: null, highlights: [], text: "Contacts : paul.martin@acme.fr, sophie.leroy@acme.fr" }]);
            }
            return response([]);
          },
          readPages: async (urls) => urls.map((url) => ({ url, ok: false, title: null, publishedAt: null, text: "", error: "HTTP 404" })),
          dns: () => mockDns(),
          githubEmails: async () => [],
          gravatarExists: async () => false,
        },
      },
    );
    assert.equal(result.email.status === "guessed" && result.email.address, "jane.doe@acme.fr");
    assert.equal(result.email.status === "guessed" && result.email.confidence, "medium");
    assert.deepEqual(result.email.status === "guessed" && result.email.evidence.map((email) => email.sourceUrl), ["https://annuaire.example/acme", "https://annuaire.example/acme"]);
  });
});

describe("Gravatar existence check (positive signal only)", () => {
  const response = (results: ExaResult[]): ExaResponse => ({ results, statuses: [] });
  const run = (gravatarExists: ContactDeps["gravatarExists"]) =>
    findContact(
      { company: "Acme", domain: "acme.fr", role: "Head of Procurement" },
      {
        signal: new AbortController().signal,
        deps: {
          exaSearch: async (body) => response(body.category === "people" ? [exaResult("https://www.linkedin.com/in/janedoe", "Jane Doe", ["Head of Procurement at Acme"])] : []),
          readPages: async (urls) => urls.map((url) => ({ url, ok: false, title: null, publishedAt: null, text: "", error: "HTTP 404" })),
          dns: () => mockDns(),
          githubEmails: async () => [],
          gravatarExists,
        },
      },
    );

  it("confirms the first variant that has a Gravatar, including an alternative", async () => {
    const checked: string[] = [];
    const result = await run(async (address) => {
      checked.push(address);
      return address === "jdoe@acme.fr";
    });
    assert.equal(result.email.status, "confirmed");
    assert.equal(result.email.status === "confirmed" && result.email.address, "jdoe@acme.fr");
    assert.equal(result.email.status === "confirmed" && result.email.method, "gravatar");
    assert.equal(checked[0], "jane.doe@acme.fr");
  });

  it("keeps the guess when no variant has a Gravatar (a 404 proves nothing)", async () => {
    const result = await run(async () => false);
    assert.equal(result.email.status, "guessed");
  });

  it("keeps the guess and lists the failure when Gravatar is unreachable", async () => {
    const result = await run(async () => {
      throw new Error("Gravatar HTTP 503");
    });
    assert.equal(result.email.status, "guessed");
    assert.ok(result.failures.some((failure) => failure.step === "gravatar"));
  });
});
