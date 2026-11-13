const BOM = "﻿";

/** Neutralise spreadsheet formula injection (OWASP CSV injection guidance). */
function defuse(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string): string {
  const safe = defuse(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

/** RFC 4180 CSV with a UTF-8 BOM (Excel) and CRLF line endings. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}
