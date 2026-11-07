#!/usr/bin/env node
/**
 * Design-system checker.
 *
 * Fails when source files drift from the 8px spacing grid, reintroduce ad-hoc
 * font sizes, or bypass the shared type scale.
 *
 * Run with: npm run check:design
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = ["app", "components"];

const SPACE_UTILS =
  "p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|" +
  "space-x|space-y|inset|inset-x|inset-y|top|bottom|left|right";

const spaceRe = new RegExp(`(?<![\\w-])-?(?:${SPACE_UTILS})-(\\d+(?:\\.\\d+)?)(?![\\w-])`, "g");
const arbitraryPxRe = new RegExp(`(?<![\\w-])-?(?:${SPACE_UTILS})-\\[(-?[\\d.]+)px\\]`, "g");
const fontSizeRe =
  /(?<![\w-])text-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)(?![\w-])/g;
const fontArbitraryRe = /(?<![\w-])text-\[[^\]]+\]/g;

const TYPE_CLASSES = [
  "type-display",
  "type-h2",
  "type-h3",
  "type-h4",
  "type-numeral",
  "type-stat",
  "type-lead",
  "type-body",
  "type-small",
  "type-label",
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const problems = [];
const typeUsage = Object.fromEntries(TYPE_CLASSES.map((name) => [name, 0]));

for (const target of TARGETS) {
  const dir = path.join(ROOT, target);
  if (!fs.existsSync(dir)) continue;

  for (const file of walk(dir)) {
    const rel = path.relative(ROOT, file);
    const source = fs.readFileSync(file, "utf8");

    for (const match of source.matchAll(spaceRe)) {
      const px = Number(match[1]) * 4;
      if (px % 8 !== 0) {
        problems.push(`${rel}: ${match[0]} = ${px}px (not a multiple of 8)`);
      }
    }
    for (const match of source.matchAll(arbitraryPxRe)) {
      const px = Number(match[1]);
      if (px % 8 !== 0) {
        problems.push(`${rel}: ${match[0]} (not a multiple of 8)`);
      }
    }
    for (const match of source.matchAll(fontSizeRe)) {
      problems.push(`${rel}: ad-hoc font size '${match[0]}'`);
    }
    for (const match of source.matchAll(fontArbitraryRe)) {
      problems.push(`${rel}: ad-hoc font size '${match[0]}'`);
    }
    for (const name of TYPE_CLASSES) {
      const re = new RegExp(`(?<![\\w-])${name}(?![\\w-])`, "g");
      typeUsage[name] += (source.match(re) ?? []).length;
    }
  }
}

if (problems.length > 0) {
  console.error("DESIGN SYSTEM VIOLATIONS:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

const used = Object.entries(typeUsage)
  .filter(([, count]) => count > 0)
  .map(([name, count]) => `${name}=${count}`)
  .join(", ");
console.log("Design system OK — 8px spacing grid + shared type scale.");
console.log(`Type scale usage: ${used}`);
