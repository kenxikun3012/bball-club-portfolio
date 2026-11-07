/** Tiny classname joiner (keeps component classes readable). */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}
