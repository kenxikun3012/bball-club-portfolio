import { PLAYER_ROLES } from "@/lib/content";

/* ------------------------------------------------------------------ */
/*  Declarative field map for the admin content editor.                */
/*  The editor renders these recursively; nothing here is server-only. */
/* ------------------------------------------------------------------ */

export type FieldDef =
  | { kind: "text"; key: string; label: string; placeholder?: string; hint?: string }
  | { kind: "textarea"; key: string; label: string; rows?: number; placeholder?: string }
  | { kind: "number"; key: string; label: string; min?: number; max?: number }
  | { kind: "checkbox"; key: string; label: string }
  | { kind: "select"; key: string; label: string; options: readonly string[] }
  | { kind: "list"; key: string; label: string; placeholder?: string }
  | { kind: "image"; key: string; label: string }
  | {
      kind: "array";
      key: string;
      label: string;
      itemNoun: string;
      itemLabel: (item: Record<string, unknown>, index: number) => string;
      fields: FieldDef[];
      blank: () => Record<string, unknown>;
    };

const str = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value ? value : fallback;

const num = (value: unknown, fallback = "?"): string =>
  typeof value === "number" ? String(value) : fallback;

/* ------------------------------- members ------------------------------- */

const playerFields: FieldDef[] = [
  { kind: "number", key: "number", label: "Jersey number", min: 0, max: 99 },
  { kind: "text", key: "name", label: "Name" },
  { kind: "text", key: "position", label: "Position" },
  { kind: "text", key: "year", label: "Year" },
  { kind: "text", key: "height", label: "Height", placeholder: "5 ft 11 in" },
  { kind: "text", key: "hometown", label: "Hometown" },
  { kind: "select", key: "role", label: "Role", options: PLAYER_ROLES },
  { kind: "number", key: "monthlySessions", label: "Monthly sessions", min: 0, max: 400 },
  { kind: "text", key: "joined", label: "Joined", placeholder: "2025/26" },
  { kind: "checkbox", key: "featured", label: "Featured on the home page" },
  { kind: "checkbox", key: "risingStar", label: "Rising star" },
  { kind: "list", key: "awards", label: "Awards", placeholder: "One award per line" },
  { kind: "textarea", key: "bio", label: "Bio", rows: 4 },
  { kind: "image", key: "image", label: "Image URL" },
];

const membersRosterFields: FieldDef[] = [
  { kind: "text", key: "id", label: "Roster id", placeholder: "men" },
  { kind: "text", key: "label", label: "Label", placeholder: "Men's roster" },
  { kind: "text", key: "shortLabel", label: "Short label", placeholder: "Men" },
  {
    kind: "array",
    key: "players",
    label: "Players",
    itemNoun: "player",
    itemLabel: (player) => `#${num(player.number)} · ${str(player.name, "New player")}`,
    fields: playerFields,
    blank: () => ({
      number: 0,
      name: "",
      position: "",
      year: "",
      height: "",
      hometown: "",
      role: "Member",
      featured: false,
      monthlySessions: 0,
      risingStar: false,
      joined: "",
      awards: [],
      bio: "",
      image: null,
    }),
  },
];

export const membersFields: FieldDef[] = [
  {
    kind: "array",
    key: "rosters",
    label: "Rosters",
    itemNoun: "roster",
    itemLabel: (roster) => str(roster.label, "New roster"),
    fields: membersRosterFields,
    blank: () => ({
      id: "new-roster",
      label: "",
      shortLabel: "",
      players: [],
    }),
  },
  {
    kind: "array",
    key: "staff",
    label: "Staff",
    itemNoun: "staff member",
    itemLabel: (member) => str(member.name, "New staff member"),
    fields: [
      { kind: "text", key: "name", label: "Name" },
      { kind: "text", key: "role", label: "Role" },
      { kind: "textarea", key: "detail", label: "Detail", rows: 3 },
      { kind: "image", key: "image", label: "Image URL" },
    ],
    blank: () => ({ name: "", role: "", detail: "", image: null }),
  },
];

/* ----------------------------- hall of fame ---------------------------- */

export const hallOfFameFields: FieldDef[] = [
  { kind: "textarea", key: "intro", label: "Intro", rows: 4 },
  {
    kind: "array",
    key: "retiredJerseys",
    label: "Retired jerseys",
    itemNoun: "jersey",
    itemLabel: (jersey) => `#${num(jersey.number)} · ${str(jersey.name, "New jersey")}`,
    fields: [
      { kind: "number", key: "number", label: "Jersey number", min: 0, max: 99 },
      { kind: "text", key: "name", label: "Name" },
      { kind: "text", key: "years", label: "Years", placeholder: "2018–2022" },
      { kind: "textarea", key: "note", label: "Note", rows: 3 },
    ],
    blank: () => ({ number: 0, name: "", years: "", note: "" }),
  },
  {
    kind: "array",
    key: "inductees",
    label: "Inductees",
    itemNoun: "inductee",
    itemLabel: (inductee) => str(inductee.name, "New inductee"),
    fields: [
      { kind: "text", key: "name", label: "Name" },
      { kind: "text", key: "years", label: "Years", placeholder: "2018–2022" },
      { kind: "text", key: "position", label: "Position" },
      { kind: "number", key: "jerseyNumber", label: "Jersey number", min: 0, max: 99 },
      { kind: "checkbox", key: "retiredJersey", label: "Jersey retired" },
      { kind: "text", key: "inducted", label: "Inducted", placeholder: "2022" },
      { kind: "textarea", key: "impact", label: "Impact", rows: 4 },
      { kind: "textarea", key: "quote", label: "Quote", rows: 2 },
      { kind: "image", key: "image", label: "Image URL" },
    ],
    blank: () => ({
      name: "",
      years: "",
      position: "",
      jerseyNumber: 0,
      retiredJersey: false,
      inducted: "",
      impact: "",
      quote: "",
      image: null,
    }),
  },
];

/* ----------------------------- achievements ---------------------------- */

export const achievementsFields: FieldDef[] = [
  {
    kind: "array",
    key: "summary",
    label: "Summary stats",
    itemNoun: "stat",
    itemLabel: (stat) => `${str(stat.value, "0")} · ${str(stat.label, "New stat")}`,
    fields: [
      { kind: "text", key: "value", label: "Value", placeholder: "12" },
      { kind: "text", key: "label", label: "Label" },
    ],
    blank: () => ({ value: "", label: "" }),
  },
  {
    kind: "array",
    key: "items",
    label: "Honours",
    itemNoun: "honour",
    itemLabel: (item) => `${str(item.year, "—")} · ${str(item.title, "New honour")}`,
    fields: [
      { kind: "text", key: "year", label: "Year", placeholder: "2025" },
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "competition", label: "Competition" },
      { kind: "text", key: "result", label: "Result" },
      { kind: "textarea", key: "note", label: "Note", rows: 3 },
    ],
    blank: () => ({ year: "", title: "", competition: "", result: "", note: "" }),
  },
];

/* ------------------------------ activities ----------------------------- */

export const activitiesFields: FieldDef[] = [
  { kind: "textarea", key: "intro", label: "Intro", rows: 4 },
  {
    kind: "array",
    key: "gallery",
    label: "Gallery",
    itemNoun: "gallery item",
    itemLabel: (item) => str(item.title, "New gallery item"),
    fields: [
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "category", label: "Category", placeholder: "Game day" },
      { kind: "text", key: "date", label: "Date", placeholder: "October 2025" },
      { kind: "textarea", key: "description", label: "Description", rows: 3 },
      { kind: "image", key: "image", label: "Image URL" },
      { kind: "checkbox", key: "featured", label: "Featured" },
    ],
    blank: () => ({
      title: "",
      category: "",
      date: "",
      description: "",
      image: null,
      featured: false,
    }),
  },
  {
    kind: "array",
    key: "upcoming",
    label: "Upcoming events",
    itemNoun: "event",
    itemLabel: (event) => `${str(event.date, "—")} · ${str(event.title, "New event")}`,
    fields: [
      { kind: "text", key: "date", label: "Date", placeholder: "2025-11-14", hint: "YYYY-MM-DD" },
      { kind: "text", key: "title", label: "Title" },
      { kind: "text", key: "type", label: "Type", placeholder: "Fixture" },
      { kind: "text", key: "location", label: "Location" },
    ],
    blank: () => ({ date: "", title: "", type: "", location: "" }),
  },
];
