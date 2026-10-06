import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseExaOutput } from "./channels/exa.ts";
import { parseGithubOutput } from "./channels/github.ts";
import { parseYoutubeOutput } from "./channels/youtube.ts";
import { isFresh, toIsoDate } from "./dates.ts";
import { searchBatch } from "./engine.ts";
import { collectBefore, createLimiter } from "./limit.ts";
import { parseJinaOutput } from "./pages.ts";
import { normalizeUrl, resolvePublicTarget } from "./url.ts";

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");

describe("parsers on captured outputs", () => {
  it("parses Exa blocks without inventing dates", () => {
    const hits = parseExaOutput(fixture("web.txt"), "web");
    assert.equal(hits.length, 8);
    assert.equal(hits[0]?.publishedAt, null);
    assert.equal(hits[1]?.publishedAt, "2021-07-29T15:17:44.000Z");
    assert.ok(hits.every((hit) => hit.url.startsWith("http") && hit.snippet.length > 0));
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

  it("splits Jina headers from content", () => {
    const page = parseJinaOutput(fixture("page.txt"));
    assert.equal(page.title, "Fasteners for aeronautics, defense and space");
    assert.ok(page.text.startsWith("Fasteners for aeronautics"));
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
