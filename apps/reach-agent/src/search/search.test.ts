import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { exaHits } from "./channels/exa.ts";
import { parseGithubOutput } from "./channels/github.ts";
import { parseYoutubeOutput } from "./channels/youtube.ts";
import { isFresh, toIsoDate } from "./dates.ts";
import { searchBatch } from "./engine.ts";
import { collectBefore, createLimiter, createRateGate } from "./limit.ts";
import { normalizeUrl, resolvePublicTarget } from "./url.ts";
import { callExa, parseExaResponse } from "./exa.ts";

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

describe("parsers on captured outputs", () => {
  // Forme de réponse : skill Exa `build-with-exa` (references/search.md, contents.md) et types `SearchResult` d'exa-js 2.25.
  it("maps Exa /search results without inventing dates", () => {
    const response = parseExaResponse(JSON.parse(fixture("exa-search.json")));
    assert.equal(response.results.length, 2);
    assert.deepEqual(response.statuses, [{ id: "https://www.lls.it/en/", status: "success" }]);
    const hits = exaHits(response, "web");
    assert.equal(hits[0]?.publishedAt, "2021-07-29T15:17:44.000Z");
    assert.equal(hits[0]?.source, "sffactory.eu");
    assert.ok(hits[0]?.snippet.includes(" … "));
    assert.equal(hits[1]?.publishedAt, null);
    assert.equal(hits[1]?.source, "lls.it");
  });

  it("rejects a payload without results", () => {
    assert.throws(() => parseExaResponse({ error: "rate limited" }), /unexpected payload/);
  });

  it("uses GitHub updatedAt as the date", () => {
    const [repo] = parseGithubOutput(fixture("github.txt"));
    assert.equal(repo?.url, "https://github.com/quex-tech/plutus-auditor");
    assert.equal(repo?.publishedAt, "2026-05-15T11:26:41.000Z");
  });

  it("keeps GitHub repos without description", () => {
    const payload = JSON.stringify([{ fullName: "a/b", url: "https://github.com/a/b", description: null, updatedAt: "2026-01-01T00:00:00Z", stargazersCount: 3 }]);
    assert.equal(parseGithubOutput(payload)[0]?.snippet, "(★ 3)");
  });

  it("converts YouTube upload_date YYYYMMDD to ISO", () => {
    const line = JSON.stringify({ title: "Demo", webpage_url: "https://www.youtube.com/watch?v=x", upload_date: "20260801", channel: "Acme" });
    assert.equal(parseYoutubeOutput(`${line}\n`)[0]?.publishedAt, "2026-08-01T00:00:00.000Z");
  });
});

describe("dates", () => {
  it("rejects N/A and keeps undated hits as non-filtered", () => {
    assert.equal(toIsoDate("N/A"), null);
    const now = Date.parse("2026-10-06T00:00:00Z");
    assert.equal(isFresh(null, 30, now), true);
    assert.equal(isFresh("2026-09-20T00:00:00Z", 30, now), true);
    assert.equal(isFresh("2025-01-01T00:00:00Z", 30, now), false);
  });
});

describe("urls", () => {
  it("normalizes for dedupe", () => {
    assert.equal(normalizeUrl("https://WWW.Example.com/a/?utm_source=x&b=1#frag"), "https://example.com/a?b=1");
    assert.equal(normalizeUrl("https://example.com/"), "https://example.com");
  });

  it("blocks non-public targets, including IPv4 hidden in IPv6", async () => {
    const blocked = [
      "http://127.0.0.1/",
      "http://[::1]/",
      "file:///etc/passwd",
      "http://printer.local/",
      "http://10.0.0.1/",
      "http://[::ffff:192.168.1.1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:7f00:1]/",
      "http://[64:ff9b::7f00:1]/",
      "http://169.254.169.254/latest/meta-data",
    ];
    for (const url of blocked) await assert.rejects(resolvePublicTarget(url), /blocked host/, url);
  });

  it("returns the validated address to pin the connection", async () => {
    assert.deepEqual(await resolvePublicTarget("http://93.184.215.14/"), { url: new URL("http://93.184.215.14/"), address: "93.184.215.14", family: 4 });
  });
});

describe("concurrency", () => {
  it("never exceeds the limiter cap", async () => {
    const limit = createLimiter(2);
    const gates = Array.from({ length: 4 }, () => Promise.withResolvers<void>());
    let active = 0;
    let peak = 0;
    const started: number[] = [];
    const runs = gates.map((gate, index) =>
      limit(async () => {
        active++;
        peak = Math.max(peak, active);
        started.push(index);
        await gate.promise;
        active--;
      }),
    );
    await Promise.resolve();
    assert.deepEqual(started, [0, 1]);
    for (const gate of gates) gate.resolve();
    await Promise.all(runs);
    assert.equal(peak, 2);
    assert.deepEqual(started, [0, 1, 2, 3]);
  });

  it("returns finished items when the deadline expires", async () => {
    const controller = new AbortController();
    const never = Promise.withResolvers<number>();
    const pending = collectBefore([1, 2], controller.signal, async (item) => (item === 1 ? item : never.promise));
    await Promise.resolve();
    controller.abort();
    assert.deepEqual(await pending, [1, undefined]);
  });

  it("drops an aborted waiter from the queue and never runs it", async () => {
    const limit = createLimiter(1);
    const holder = Promise.withResolvers<void>();
    const first = limit(() => holder.promise);
    const controller = new AbortController();
    let ran = false;
    const waiter = limit(async () => {
      ran = true;
    }, controller.signal);
    controller.abort();
    await assert.rejects(waiter);
    holder.resolve();
    await first;
    await limit(async () => undefined);
    assert.equal(ran, false);
  });

  it("reports disabled channels as failures without running them", async () => {
    const result = await searchBatch([{ channel: "reddit", query: "anything" }], { signal: new AbortController().signal, channels: new Set(["web"]) });
    assert.deepEqual(result.failures, [{ channel: "reddit", query: "anything", reason: "channel disabled" }]);
    assert.equal(result.hits.length, 0);
  });
});

describe("exa rate limit", () => {
  it("spaces task starts by the gate interval, shared by every caller", async () => {
    const gate = createRateGate(40);
    const starts: number[] = [];
    await Promise.all(Array.from({ length: 4 }, () => gate(async () => void starts.push(performance.now()))));
    for (let i = 1; i < starts.length; i++) assert.ok(starts[i]! - starts[i - 1]! >= 35, `start ${i} too early`);
  });

  it("drops an aborted waiter without running it", async () => {
    const gate = createRateGate(200);
    let ran = 0;
    const controller = new AbortController();
    const first = gate(async () => void ran++);
    const second = gate(async () => void ran++, controller.signal);
    controller.abort(new Error("stop"));
    await first;
    await assert.rejects(second, /stop/);
    assert.equal(ran, 1);
  });

  it("retries an HTTP 429 once, then surfaces the error", async (t) => {
    process.env.EXA_API_KEY = "test-key";
    const ok = { results: [], statuses: [] };
    const statuses = [429, 200, 429, 429];
    t.mock.method(globalThis, "fetch", async () => {
      const status = statuses.shift() ?? 500;
      return new Response(status === 200 ? JSON.stringify(ok) : "rate limited", { status });
    });
    assert.deepEqual(await callExa("/search", {}, new AbortController().signal), { results: [], statuses: [] });
    await assert.rejects(callExa("/search", {}, new AbortController().signal), /HTTP 429/);
    assert.equal(statuses.length, 0);
  });
});
