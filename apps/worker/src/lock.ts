import { chmodSync, closeSync, fstatSync, mkdirSync, openSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function errorCode(error: unknown): string | undefined {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

function owner(path: string): number {
  const text = readFileSync(path, "utf8");
  if (!/^[1-9][0-9]*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new Error("Worker lock owner is invalid. Inspect the lock before recovery.");
  }
  return Number(text);
}

// Un seul exécuteur de Tasks par Coworker : verrou PID, repris seulement si son propriétaire est mort.
export function acquireWorkerLock(path: string): () => void {
  const directory = dirname(path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const recovery = `${path}.recovery`;
  let guard: number;
  try {
    guard = openSync(recovery, "wx", 0o600);
  } catch (error) {
    if (errorCode(error) === "EEXIST") throw new Error("Worker lock recovery is in progress. Inspect its owner before retry.");
    throw error;
  }
  let fd: number | undefined;
  try {
    writeFileSync(guard, String(process.pid));
    try {
      fd = openSync(path, "wx", 0o600);
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      const pid = owner(path);
      try {
        process.kill(pid, 0);
      } catch (check) {
        if (errorCode(check) !== "ESRCH") throw check;
        unlinkSync(path);
        fd = openSync(path, "wx", 0o600);
      }
      if (fd === undefined) throw new Error(`Worker already running: ${pid}`);
    }
    writeFileSync(fd, String(process.pid));
    const identity = fstatSync(fd);
    closeSync(fd);
    fd = undefined;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      try {
        const current = statSync(path);
        if (current.dev === identity.dev && current.ino === identity.ino && owner(path) === process.pid) unlinkSync(path);
      } catch (error) {
        if (errorCode(error) !== "ENOENT") throw error;
      }
    };
  } finally {
    if (fd !== undefined) closeSync(fd);
    closeSync(guard);
    unlinkSync(recovery);
  }
}
