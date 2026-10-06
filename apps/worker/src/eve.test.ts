import assert from "node:assert/strict";
import { test } from "node:test";
import { MAX_REPORT_BYTES } from "../../../packages/contract/src/index.ts";
import { fitReport } from "./eve.ts";

test("fitReport laisse un rapport court intact", () => {
  assert.equal(fitReport("# Reach\n\nok"), "# Reach\n\nok");
});

test("fitReport tronque à la dernière ligne complète sous la limite", () => {
  const line = `${"é".repeat(99)}\n`;
  const report = `# Reach\n${line.repeat(Math.ceil(MAX_REPORT_BYTES / 198) + 10)}`;
  const fitted = fitReport(report);
  assert.ok(new TextEncoder().encode(fitted).byteLength <= MAX_REPORT_BYTES);
  assert.ok(fitted.endsWith("\n\n_Rapport tronqué._\n"));
  assert.ok(fitted.startsWith("# Reach\n"));
  assert.ok(fitted.replace("\n\n_Rapport tronqué._\n", "").endsWith("é"));
});
