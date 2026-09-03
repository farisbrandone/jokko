import type { DraftProduct } from '@jokko/contracts';

/** Analyse CSV minimale (séparateur `,` ou `;`, guillemets doubles échappés). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const delimiter = text.split('\n')[0].includes(';') && !text.split('\n')[0].includes(',') ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((v) => v.trim() !== '')) rows.push(row);
  }
  return rows;
}

const ALIASES: Record<string, string[]> = {
  name: ['name', 'nom', 'title', 'titre', 'product', 'produit'],
  description: ['description', 'desc', 'détails', 'details'],
  category: ['category', 'catégorie', 'categorie'],
  price: ['price', 'prix', 'amount', 'montant'],
  stock: ['stock', 'quantity', 'quantité', 'quantite', 'qty'],
  image: ['image', 'images', 'image_url', 'photo', 'picture'],
};

function resolveHeader(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase();
    for (const [field, names] of Object.entries(ALIASES)) {
      if (names.includes(key)) idx[field] = i;
    }
  });
  return idx;
}

export interface CsvRow {
  line: number;
  draft?: DraftProduct;
  error?: string;
}

export function parseProductCsv(text: string, currency: string): CsvRow[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [{ line: 1, error: 'CSV vide ou sans lignes de données' }];

  const idx = resolveHeader(rows[0]);
  if (idx.name === undefined || idx.price === undefined) {
    return [{ line: 1, error: 'Colonnes « name » et « price » requises dans l’en-tête' }];
  }

  return rows.slice(1).map((cells, i): CsvRow => {
    const line = i + 2;
    const get = (f: string) => (idx[f] !== undefined ? (cells[idx[f]] ?? '').trim() : '');
    const name = get('name');
    if (!name) return { line, error: 'nom manquant' };

    const rawPrice = get('price').replace(/[^\d.,]/g, '').replace(',', '.');
    const amount = Math.round(parseFloat(rawPrice) * 100);
    if (!Number.isFinite(amount) || amount < 0) return { line, error: 'prix invalide' };

    const stockRaw = parseInt(get('stock'), 10);
    const images = get('image')
      .split(/[|\s]+/)
      .filter((u) => /^https?:\/\//.test(u))
      .slice(0, 6);

    return {
      line,
      draft: {
        name: name.slice(0, 140),
        description: get('description').slice(0, 5000),
        category: get('category') || 'Import',
        priceAmount: amount,
        currency,
        stock: Number.isFinite(stockRaw) && stockRaw > 0 ? stockRaw : 0,
        images,
      },
    };
  });
}
