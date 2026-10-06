// Lance `eve dev` sans UI sur 127.0.0.1, comme start.mjs de la référence Masumi.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const DEFAULT_PORT = 21949;

const port = Number(process.env.EVE_PORT ?? DEFAULT_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("EVE_PORT must be an integer from 1 to 65535");

const manifestPath = createRequire(import.meta.url).resolve("eve/package.json");
const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
const bin =
  typeof manifest === "object" && manifest !== null && "bin" in manifest && typeof manifest.bin === "object" && manifest.bin !== null && "eve" in manifest.bin
    ? manifest.bin.eve
    : undefined;
if (typeof bin !== "string") throw new Error("Installed eve package has no eve executable");

const args = ["dev", "--no-ui", "--no-default-extensions", "--host", "127.0.0.1", "--port", String(port)];
const child = spawn(process.execPath, [resolve(dirname(manifestPath), bin), ...args], {
  stdio: "inherit",
  env: { ...process.env, EVE_PORT: String(port), EVE_URL: `http://127.0.0.1:${port}` },
});
child.on("error", (error) => {
  console.error(`eve could not start: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
