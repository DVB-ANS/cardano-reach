// Usage : node scripts/research.ts --text "<task>" [--answer "<réponse>"]... [--out <fichier>]
import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createClient, simulateTask } from "../src/simulator.ts";

const { values } = parseArgs({
  options: {
    text: { type: "string" },
    answer: { type: "string", multiple: true, default: [] },
    out: { type: "string" },
  },
});
if (!values.text?.trim()) throw new Error('Missing --text "<task>"');

const result = await simulateTask(createClient(), { text: values.text, answers: values.answer });
for (const question of result.questions) console.log(`Question : ${question}`);
console.log(`Brief : ${JSON.stringify(result.brief)}`);
if (values.out) await writeFile(values.out, result.report);
else console.log(`\n${result.report}\n`);
console.log(JSON.stringify({ intakeMs: result.intakeMs, researchMs: result.researchMs, questions: result.questions.length }));
