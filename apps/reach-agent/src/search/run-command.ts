import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const STDERR_EXCERPT_LENGTH = 300;

export interface RunCommandOptions {
  timeoutMs: number;
  signal: AbortSignal;
}

export async function runCommand(cmd: string, args: readonly string[], options: RunCommandOptions): Promise<string> {
  try {
    const { stdout } = await execFileAsync(cmd, args, {
      encoding: "utf8",
      maxBuffer: MAX_BUFFER_BYTES,
      signal: AbortSignal.any([options.signal, AbortSignal.timeout(options.timeoutMs)]),
    });
    return stdout;
  } catch (error) {
    const stderr = typeof error === "object" && error !== null && "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
    const detail = stderr || (error instanceof Error ? error.message : String(error));
    throw new Error(`${cmd} failed: ${detail.slice(0, STDERR_EXCERPT_LENGTH)}`, { cause: error });
  }
}
