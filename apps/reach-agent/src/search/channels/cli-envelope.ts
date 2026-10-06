// Enveloppe JSON commune à twitter-cli et rdt-cli (`success_payload` / `error_payload`) : `{ ok, schema_version, data | error }`.
import { isRecord } from "../json.ts";

/** Rend `data` si `ok === true`, sinon lève l'erreur rapportée par la CLI. */
export function unwrapCliEnvelope(output: string, cli: string): unknown {
  const parsed: unknown = JSON.parse(output);
  if (!isRecord(parsed)) throw new Error(`${cli} returned a non-object payload`);
  if (parsed.ok !== true) {
    const message = isRecord(parsed.error) && typeof parsed.error.message === "string" ? parsed.error.message : "unknown";
    throw new Error(`${cli} error: ${message}`);
  }
  return parsed.data;
}
