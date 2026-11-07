/**
 * Server-side environment access.
 *
 * Values are read lazily (never at module load) so `next build` does not need
 * secrets — only actual API requests do.
 */
export function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `Missing ${name}. Add it to .env.local (see .env.example) and restart the server.`,
    );
  }
  return value;
}

export const mongoDbName = () => readEnv("MONGODB_DB") ?? "bball_club";
