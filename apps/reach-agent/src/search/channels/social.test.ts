// Fixtures reproduisant les schémas lus dans les sources installées (pipx, Python 3.14) :
// - twitter.json : twitter_cli/output.py `success_payload` + twitter_cli/serialization.py `tweet_to_dict`
//   (`createdAtISO` = twitter_cli/timeutil.py `format_iso8601`).
// - reddit.json : rdt_cli/commands/_common.py `success_payload` + rdt_cli/models.py `Post.to_dict`
//   (champs remplis par rdt_cli/parser.py `parse_post`, `created_utc` = 0.0 quand absent).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { buildRedditArgs, parseRedditOutput } from "./reddit.ts";
import { buildTwitterArgs, buildTwitterQuery, parseTwitterOutput } from "./twitter.ts";

const fixture = (name: string) => readFileSync(new URL(`../__fixtures__/${name}`, import.meta.url), "utf8");
const NOW = Date.parse("2026-10-07T12:00:00Z");

describe("twitter channel", () => {
  it("parses tweets, builds x.com URLs and keeps createdAtISO", () => {
    const hits = parseTwitterOutput(fixture("twitter.json"));
    assert.equal(hits.length, 2);
    assert.equal(hits[0]?.url, "https://x.com/acmeaero/status/1975512345678901234");
    assert.equal(hits[0]?.publishedAt, "2026-09-24T08:15:30.000Z");
    assert.ok(hits[0]?.title.startsWith("@acmeaero: We just shipped"));
    assert.ok(!hits[0]?.snippet.includes("\n"));
  });

  it("never invents a date", () => {
    const payload = JSON.stringify({ ok: true, schema_version: "1", data: [{ id: "1", text: "hi", author: { screenName: "a" }, createdAtISO: "" }] });
    assert.equal(parseTwitterOutput(payload)[0]?.publishedAt, null);
  });

  it("surfaces CLI error envelopes", () => {
    const payload = JSON.stringify({ ok: false, schema_version: "1", error: { code: "not_authenticated", message: "Cookie expired" } });
    assert.throws(() => parseTwitterOutput(payload), /Cookie expired/);
  });

  it("appends since: only when freshnessDays is set, after --", () => {
    assert.equal(buildTwitterQuery({ channel: "twitter", query: "titanium" }, NOW), "titanium");
    const args = buildTwitterArgs({ channel: "twitter", query: "-titanium", freshnessDays: 30 }, NOW);
    assert.deepEqual(args.slice(-2), ["--", "-titanium since:2026-09-07"]);
    assert.ok(args.includes("--json"));
  });
});

describe("reddit channel", () => {
  it("maps created_utc to ISO and builds permalink URLs", () => {
    const hits = parseRedditOutput(fixture("reddit.json"));
    assert.equal(hits.length, 2);
    assert.equal(hits[0]?.url, "https://www.reddit.com/r/AerospaceEngineering/comments/1nabc12/who_supplies_en_9100_titanium_fasteners_in_small/");
    assert.equal(hits[0]?.publishedAt, "2025-09-24T08:00:00.000Z");
    assert.equal(hits[0]?.title, "Who supplies EN 9100 titanium fasteners in small batches? — r/AerospaceEngineering");
  });

  it("treats created_utc 0 as undated and uses the link as snippet for link posts", () => {
    const hit = parseRedditOutput(fixture("reddit.json"))[1];
    assert.equal(hit?.publishedAt, null);
    assert.equal(hit?.url, "https://www.reddit.com/r/manufacturing/comments/1mzzz99/titanium_machining_shop_opens_new_5axis_line/");
    assert.equal(hit?.snippet, "https://news.example.com/titanium-5-axis");
  });

  it("puts the query after --", () => {
    assert.deepEqual(buildRedditArgs({ channel: "reddit", query: "-x" }).slice(-2), ["--", "-x"]);
  });
});
