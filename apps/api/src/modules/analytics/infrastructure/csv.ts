/** Échappe une valeur pour une cellule CSV (RFC 4180 — séparateur virgule). */
function escapeCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Construit un CSV (en-tête + lignes) à partir de colonnes nommées. */
export function toCsv(columns: string[], rows: (string | number)[][]): string {
  const lines = [columns.map(escapeCell).join(',')];
  for (const row of rows) lines.push(row.map(escapeCell).join(','));
  return lines.join('\r\n') + '\r\n';
}
