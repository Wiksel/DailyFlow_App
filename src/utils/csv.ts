export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  // Escape quotes and wrap in quotes if contains separators/newlines
  const needsQuotes = /[",\n\r;]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvValue).join(';');
  const lines = rows.map((row) => headers.map((h) => escapeCsvValue(row[h])).join(';'));
  return [headerLine, ...lines].join('\n');
}


