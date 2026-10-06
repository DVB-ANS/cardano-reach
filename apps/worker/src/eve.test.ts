import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_REPORT_BYTES } from "../../../packages/contract/src/index.ts";
import { fitReport, repairTables } from "./eve.ts";

test("fitReport laisse un rapport court intact", () => {
  assert.equal(fitReport("# Richard\n\nok"), "# Richard\n\nok");
});

test("fitReport tronque à la dernière ligne complète sous la limite", () => {
  const line = `${"é".repeat(99)}\n`;
  const report = `# Richard\n${line.repeat(Math.ceil(MAX_REPORT_BYTES / 198) + 10)}`;
  const fitted = fitReport(report);
  assert.ok(new TextEncoder().encode(fitted).byteLength <= MAX_REPORT_BYTES);
  assert.ok(fitted.endsWith("\n\n_Rapport tronqué._\n"));
  assert.ok(fitted.startsWith("# Richard\n"));
  assert.ok(fitted.replace("\n\n_Rapport tronqué._\n", "").endsWith("é"));
});

test("repairTables aligne la ligne de séparation sur l'en-tête (cas réel de la Task M2)", () => {
  const broken = "intro\n| # | Entreprise | Score |\n|---|---|---|---|\n| 1 | [A](https://a.fr) | 85 |";
  assert.equal(repairTables(broken), "intro\n| # | Entreprise | Score |\n|---|---|---|\n| 1 | [A](https://a.fr) | 85 |");
  const short = "| a | b | c |\n|:--|--:|\n| 1 | 2 | 3 |";
  assert.equal(repairTables(short), "| a | b | c |\n|:--|--:|---|\n| 1 | 2 | 3 |");
});

test("repairTables ne touche pas un tableau correct ni un texte sans tableau", () => {
  const ok = "| a | b |\n|---|---:|\n| x | y |";
  assert.equal(repairTables(ok), ok);
  const text = "Une ligne\n---\nUn titre souligné";
  assert.equal(repairTables(text), text);
  const escaped = "| a \\| b | c |\n|---|---|---|";
  assert.equal(repairTables(escaped), "| a \\| b | c |\n|---|---|");
});
