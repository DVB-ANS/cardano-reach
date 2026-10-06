// Usage : node scripts/golden.ts [--only <id>]... — joue tests/golden/cases.json via le simulateur, exit 1 si un cas échoue.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createLimiter } from "../src/search/limit.ts";
import { createClient, simulateTask, type SimulationResult } from "../src/simulator.ts";

const CASES_PATH = new URL("../tests/golden/cases.json", import.meta.url);
const OUT_DIR = new URL("../tests/golden/out/", import.meta.url);
const PARALLEL_CASES = 3;
const DATA_ROW = /^\|\s*\d+\s*\|/;

interface GoldenCase {
  id: string;
  text: string;
  answers: string[];
  expect: { mode: string; niche: string; minRows: number; mustAsk?: boolean };
}

function isGoldenCase(value: unknown): value is GoldenCase {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  const expect = item.expect as Record<string, unknown> | undefined;
  return (
    typeof item.id === "string" &&
    typeof item.text === "string" &&
    Array.isArray(item.answers) &&
    item.answers.every((answer) => typeof answer === "string") &&
    typeof expect?.mode === "string" &&
    typeof expect.niche === "string" &&
    typeof expect.minRows === "number"
  );
}

/** Rend la liste des écarts entre un résultat et les attentes du cas. */
function check(golden: GoldenCase, result: SimulationResult): string[] {
  const problems: string[] = [];
  const { expect } = golden;
  if (result.brief.mode !== expect.mode) problems.push(`mode ${result.brief.mode} ≠ ${expect.mode}`);
  if (result.brief.niche !== expect.niche) problems.push(`niche ${result.brief.niche} ≠ ${expect.niche}`);
  if (expect.mustAsk && result.questions.length === 0) problems.push("aucune question posée");
  if (!result.report.startsWith("# ")) problems.push("le rapport ne commence pas par `# `");
  const rows = result.report.split("\n").filter((line) => DATA_ROW.test(line.trim()));
  if (rows.length < expect.minRows) problems.push(`${rows.length} lignes < ${expect.minRows}`);
  for (const row of rows) {
    if (!row.includes("](http")) problems.push(`ligne sans lien http : ${row.slice(0, 80)}`);
  }
  return problems;
}

const { values } = parseArgs({ options: { only: { type: "string", multiple: true, default: [] } } });
const parsed: unknown = JSON.parse(await readFile(CASES_PATH, "utf8"));
if (!Array.isArray(parsed) || !parsed.every(isGoldenCase)) throw new Error("tests/golden/cases.json is malformed");
const unknownIds = values.only.filter((id) => !parsed.some((golden) => golden.id === id));
if (unknownIds.length) throw new Error(`Unknown golden case id: ${unknownIds.join(", ")}`);
const cases = values.only.length ? parsed.filter((golden) => values.only.includes(golden.id)) : parsed;

await mkdir(OUT_DIR, { recursive: true });
const client = createClient();
const limit = createLimiter(PARALLEL_CASES);
const outcomes = await Promise.all(
  cases.map((golden) =>
    limit(async () => {
      try {
        const result = await simulateTask(client, golden);
        await writeFile(new URL(`${golden.id}.md`, OUT_DIR), result.report);
        const problems = check(golden, result);
        console.log(`${problems.length ? "✗" : "✓"} ${golden.id} (${result.intakeMs + result.researchMs} ms)${problems.map((p) => `\n    - ${p}`).join("")}`);
        return { id: golden.id, ok: problems.length === 0, problems, intakeMs: result.intakeMs, researchMs: result.researchMs, questions: result.questions.length };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`✗ ${golden.id}\n    - ${message}`);
        return { id: golden.id, ok: false, problems: [message], intakeMs: null, researchMs: null, questions: null };
      }
    }),
  ),
);

await writeFile(new URL("timings.json", OUT_DIR), `${JSON.stringify(outcomes, null, 2)}\n`);
const failed = outcomes.filter((outcome) => !outcome.ok).length;
console.log(`\n${outcomes.length - failed}/${outcomes.length} cas verts`);
if (failed) process.exitCode = 1;
