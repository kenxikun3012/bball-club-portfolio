/**
 * Structured server logging.
 *
 * Each call writes ONE JSON line (level, scope, message, error, time) that Vercel Logs
 * can filter on (`scope`, `level`). Never pass request bodies, passwords or tokens in
 * `meta`; connection strings in error text are redacted as a safety net.
 */
type Level = "error" | "warn";

/** Hides credentials in connection strings and `password=` style fragments. */
export function redact(text: string): string {
  return text
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1[redacted]@")
    .replace(/((?:password|secret|token|api[_-]?key)=)[^&\s]+/gi, "$1[redacted]");
}

function describe(error: unknown): { name?: string; message?: string; stack?: string } | undefined {
  if (error === undefined || error === null) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redact(error.message),
      stack: error.stack ? redact(error.stack).split("\n").slice(0, 6).join("\n") : undefined,
    };
  }
  return { message: redact(String(error)) };
}

function write(level: Level, scope: string, message: string, error?: unknown, meta?: Record<string, unknown>) {
  const line = JSON.stringify({
    level,
    scope,
    message,
    error: describe(error),
    ...meta,
    time: new Date().toISOString(),
  });
  if (level === "error") console.error(line);
  else console.warn(line);
}

export function logError(scope: string, message: string, error?: unknown, meta?: Record<string, unknown>) {
  write("error", scope, message, error, meta);
}

export function logWarn(scope: string, message: string, error?: unknown, meta?: Record<string, unknown>) {
  write("warn", scope, message, error, meta);
}
