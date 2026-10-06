// Usage : node scripts/launch.ts dev|start
// dev   : `eve dev` sans UI sur 127.0.0.1:EVE_PORT (21949), comme start.mjs de la référence Masumi.
// start : `eve start` sur 0.0.0.0:PORT (3000), après vérification des identifiants Basic obligatoires.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const DEFAULT_DEV_PORT = 21949;
const DEFAULT_START_PORT = 3000;

const mode = process.argv[2];
if (mode !== "dev" && mode !== "start") throw new Error("Usage: node scripts/launch.ts dev|start");

const port = Number(mode === "dev" ? (process.env.EVE_PORT ?? DEFAULT_DEV_PORT) : (process.env.PORT ?? DEFAULT_START_PORT));
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be an integer from 1 to 65535");
if (mode === "start" && (!process.env.ROUTE_AUTH_BASIC_USER || !process.env.ROUTE_AUTH_BASIC_PASSWORD)) {
  throw new Error("Missing ROUTE_AUTH_BASIC_USER/PASSWORD");
}

const manifestPath = createRequire(import.meta.url).resolve("eve/package.json");
const manifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
const bin =
  typeof manifest === "object" && manifest !== null && "bin" in manifest && typeof manifest.bin === "object" && manifest.bin !== null && "eve" in manifest.bin
    ? manifest.bin.eve
    : undefined;
if (typeof bin !== "string") throw new Error("Installed eve package has no eve executable");

const args =
  mode === "dev"
    ? ["dev", "--no-ui", "--no-default-extensions", "--host", "127.0.0.1", "--port", String(port)]
    : ["start", "--host", "0.0.0.0", "--port", String(port)];
const env = mode === "dev" ? { ...process.env, EVE_PORT: String(port), EVE_URL: `http://127.0.0.1:${port}` } : process.env;
const child = spawn(process.execPath, [resolve(dirname(manifestPath), bin), ...args], { stdio: "inherit", env });
child.on("error", (error) => {
  console.error(`eve could not start: ${error.message}`);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
