import crypto from "node:crypto";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;

const TEMP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Returns a safe, user-facing message, or null when the password is acceptable. */
export function validateNewPassword(
  password: string,
  context: { email: string; current?: string },
): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Use at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) {
    return `Use at most ${PASSWORD_MAX} characters.`;
  }
  if (password.trim().length === 0) {
    return "Password cannot be only spaces.";
  }

  const email = context.email.trim().toLowerCase();
  const lower = password.toLowerCase();
  if (lower === email) return "Password cannot be your email address.";

  const local = email.split("@")[0] ?? "";
  if (local.length >= 3 && lower.includes(local)) {
    return "Password cannot contain the first part of your email address.";
  }

  if (context.current !== undefined && password === context.current) {
    return "Choose a password different from the current one.";
  }
  return null;
}

/** 16 characters from an unambiguous alphabet (no 0/O, 1/l/I). */
export function generateTempPassword(): string {
  const bytes = crypto.randomBytes(16);
  // 256 % 56 !== 0, so reject the biased tail to keep the distribution uniform.
  const limit = 256 - (256 % TEMP_ALPHABET.length);
  let out = "";
  let pool = bytes;
  while (out.length < 16) {
    for (const byte of pool) {
      if (byte < limit && out.length < 16) out += TEMP_ALPHABET[byte % TEMP_ALPHABET.length];
    }
    if (out.length < 16) pool = crypto.randomBytes(16);
  }
  return out;
}
