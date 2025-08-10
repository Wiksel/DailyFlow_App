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

// Very small CSV parser for semicolon-separated CSV with quotes
export function fromCsv(csv: string): Array<Record<string, string>> {
  if (!csv.trim()) return [];
  const lines = csv.split(/\r?\n/).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuotes = false; }
        } else cur += ch;
      } else {
        if (ch === ';') { out.push(cur); cur = ''; }
        else if (ch === '"') { inQuotes = true; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(l => {
    const cells = parseLine(l);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { rec[h] = cells[idx] ?? ''; });
    return rec;
  });
}


