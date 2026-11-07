import { z } from "zod";
import { POSITIONS, YEARS } from "@/lib/form-options";

/* ------------------------------------------------------------------ */
/*  Server-side validation — the client is never trusted.              */
/* ------------------------------------------------------------------ */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG = /<\/?[a-z][^>]*>/i;

/** Normalize unicode, drop control characters and collapse whitespace. */
export function cleanText(value: string, maxLength: number): string {
  return value
    .normalize("NFKC")
    .replace(CONTROL_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

const nameSchema = z
  .string()
  .transform((value) => cleanText(value, 80))
  .refine((value) => value.length >= 2, "Enter your full name.")
  .refine((value) => value.length <= 80, "Name is too long.")
  .refine(
    (value) => /^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(value),
    "Name can only contain letters, spaces, apostrophes, dots and hyphens.",
  );

const emailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => value.length <= 254, "Email address is too long.")
  .refine(
    (value) =>
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
        value,
      ),
    "Enter a valid email address.",
  );

const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s().-]/g, ""))
  .refine(
    (value) => /^\+[1-9]\d{6,14}$/.test(value),
    "Enter a phone number in international format, e.g. +15551234567.",
  );

const messageSchema = z
  .string()
  .transform((value) => cleanText(value, 1_200))
  .refine((value) => value.length <= 1_200, "Message is too long.")
  .refine((value) => !HTML_TAG.test(value), "Message can't contain HTML.");

/**
 * `.strict()` matters: unknown keys (including Mongo operator keys such as
 * `$where` or dotted paths) are rejected instead of reaching the database.
 */
export const joinRequestSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    position: z.enum(POSITIONS, {
      errorMap: () => ({ message: "Choose a position from the list." }),
    }),
    year: z.enum(YEARS, {
      errorMap: () => ({ message: "Choose your year of study from the list." }),
    }),
    message: messageSchema.optional(),
    consent: z
      .boolean()
      .refine((value) => value === true, "Please agree to be contacted."),
    // Honeypot: handled before validation, kept here so `.strict()` allows it.
    website: z.string().max(200).optional(),
  })
  .strict();

export type JoinRequest = z.infer<typeof joinRequestSchema>;

/** Friendly, non-revealing field errors for the client. */
export function fieldErrors(
  error: z.ZodError,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key] =
        issue.code === "unrecognized_keys"
          ? "Unexpected field in the request."
          : issue.message;
    }
  }
  if (error.issues.some((issue) => issue.code === "unrecognized_keys")) {
    result.form = "Unexpected field in the request.";
  }
  return result;
}
