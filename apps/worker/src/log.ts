// Une ligne JSON par évènement : lisible par `docker compose logs` et filtrable par taskId.
export type Fields = Record<string, string | number | boolean | null | undefined>;

function write(level: "info" | "warn" | "error", msg: string, fields: Fields = {}): void {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...fields });
  if (level === "info") process.stdout.write(`${line}\n`);
  else process.stderr.write(`${line}\n`);
}

export const log = {
  info: (msg: string, fields?: Fields) => write("info", msg, fields),
  warn: (msg: string, fields?: Fields) => write("warn", msg, fields),
  error: (msg: string, fields?: Fields) => write("error", msg, fields),
};

export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error)).slice(0, 300);
