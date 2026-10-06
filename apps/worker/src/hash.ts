import { createHash } from "node:crypto";

export const sha256 = (text: string): string => createHash("sha256").update(text, "utf8").digest("hex");

// Tasks Sokosumi : hash SHA-256 brut des octets UTF-8, sans nonce ni échappement JSON.
export const taskHash = sha256;

// API standard Masumi (MIP-004) : hash préfixé par le nonce de l'acheteur.
export const standardInputHash = (input: { prompt: string }, nonce: string): string => sha256(`${nonce};${JSON.stringify({ prompt: input.prompt })}`);
export const standardResultHash = (result: string, nonce: string): string => sha256(`${nonce};${result}`);
