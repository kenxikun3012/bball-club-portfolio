import { z } from "zod";
import { PLAYER_ROLES } from "@/lib/content";
import type { EditableContentId } from "@/lib/content-db";

/* ------------------------------------------------------------------ */
/*  Validation for admin content writes.                              */
/*                                                                    */
/*  Every object is `.strict()` so operator keys (`$where`, dotted    */
/*  paths, unknown fields) are rejected before they reach Mongo.       */
/*  These schemas validate a whole document; the client always sends   */
/*  the complete `data` object.                                       */
/* ------------------------------------------------------------------ */

const required = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Required.")
    .max(max, `Must be ${max} characters or fewer.`);

const optional = (max: number) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer.`).optional();

/** Empty strings become `null`; otherwise require an https URL. */
const imageUrl = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .transform((value) => (value ? value : null))
  .refine(
    (value) => value === null || /^https:\/\/[^\s]+$/.test(value),
    "Use an https:// URL or leave blank.",
  );

/* ------------------------------- members ------------------------------- */

const playerSchema = z
  .object({
    number: z.number().int().min(0).max(99),
    name: required(80),
    position: required(60),
    year: required(40),
    height: optional(30),
    hometown: optional(60),
    role: z.enum(PLAYER_ROLES),
    featured: z.boolean().optional(),
    monthlySessions: z.number().int().min(0).max(400),
    risingStar: z.boolean().optional(),
    joined: required(20),
    awards: z.array(optional(120)).max(20),
    bio: optional(600),
    image: imageUrl,
  })
  .strict();

const rosterSchema = z
  .object({
    id: required(20).regex(
      /^[a-z0-9-]+$/,
      "Use lowercase letters, numbers and dashes only.",
    ),
    label: required(60),
    shortLabel: required(20),
    players: z.array(playerSchema).max(80),
  })
  .strict()
  .superRefine((roster, ctx) => {
    const seen = new Set<number>();
    roster.players.forEach((player, index) => {
      if (seen.has(player.number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["players", index, "number"],
          message: `Jersey number ${player.number} is already used in this roster.`,
        });
      }
      seen.add(player.number);
    });
  });

const staffSchema = z
  .object({
    name: required(80),
    role: required(60),
    detail: optional(300),
    image: imageUrl,
  })
  .strict();

export const membersSchema = z
  .object({
    rosters: z.array(rosterSchema).min(1).max(6),
    staff: z.array(staffSchema).max(30),
  })
  .strict()
  .superRefine((document, ctx) => {
    const ids = new Set<string>();
    document.rosters.forEach((roster, index) => {
      if (ids.has(roster.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rosters", index, "id"],
          message: `Roster id "${roster.id}" is already used.`,
        });
      }
      ids.add(roster.id);
    });
  });

/* ----------------------------- hall of fame ---------------------------- */

const retiredJerseySchema = z
  .object({
    number: z.number().int().min(0).max(99),
    name: required(80),
    years: required(20),
    note: optional(300),
  })
  .strict();

const inducteeSchema = z
  .object({
    name: required(80),
    years: required(20),
    position: required(60),
    jerseyNumber: z.number().int().min(0).max(99),
    retiredJersey: z.boolean().optional(),
    inducted: required(10),
    impact: optional(800),
    quote: optional(300),
    image: imageUrl,
  })
  .strict();

export const hallOfFameSchema = z
  .object({
    intro: optional(1200),
    retiredJerseys: z.array(retiredJerseySchema).max(100),
    inductees: z.array(inducteeSchema).max(200),
  })
  .strict()
  .superRefine((document, ctx) => {
    const seen = new Set<number>();
    document.retiredJerseys.forEach((jersey, index) => {
      if (seen.has(jersey.number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["retiredJerseys", index, "number"],
          message: `Jersey #${jersey.number} is already retired.`,
        });
      }
      seen.add(jersey.number);
    });
  });

/* ----------------------------- achievements ---------------------------- */

const statSchema = z
  .object({
    value: required(20),
    label: required(60),
  })
  .strict();

const achievementSchema = z
  .object({
    year: required(20),
    title: required(120),
    competition: optional(160),
    result: optional(60),
    note: optional(600),
  })
  .strict();

export const achievementsSchema = z
  .object({
    summary: z.array(statSchema).max(12),
    items: z.array(achievementSchema).max(200),
  })
  .strict();

/* ------------------------------ activities ----------------------------- */

const galleryItemSchema = z
  .object({
    title: required(120),
    category: optional(40),
    date: optional(40),
    description: optional(500),
    image: imageUrl,
    featured: z.boolean().optional(),
  })
  .strict();

const eventSchema = z
  .object({
    date: required(10).regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."),
    title: required(120),
    type: optional(40),
    location: optional(120),
  })
  .strict();

export const activitiesSchema = z
  .object({
    intro: optional(1200),
    gallery: z.array(galleryItemSchema).max(100),
    upcoming: z.array(eventSchema).max(50),
  })
  .strict();

export const contentSchemas: Record<EditableContentId, z.ZodTypeAny> = {
  members: membersSchema,
  hallOfFame: hallOfFameSchema,
  achievements: achievementsSchema,
  activities: activitiesSchema,
};

export interface FieldIssue {
  path: string;
  message: string;
}

/** Safe, value-free field issues for the client. */
export function schemaIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.slice(0, 25).map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}
