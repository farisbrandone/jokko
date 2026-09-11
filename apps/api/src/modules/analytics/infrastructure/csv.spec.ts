import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('joint colonnes et lignes avec CRLF', () => {
    const csv = toCsv(['a', 'b'], [[1, 2], [3, 4]]);
    expect(csv).toBe('a,b\r\n1,2\r\n3,4\r\n');
  });

  it('échappe les virgules, guillemets et retours à la ligne', () => {
    const csv = toCsv(['nom'], [['Ama, "la reine"'], ['ligne1\nligne2']]);
    expect(csv).toContain('"Ama, ""la reine"""');
    expect(csv).toContain('"ligne1\nligne2"');
  });

  it('ne touche pas aux valeurs simples', () => {
    const csv = toCsv(['x'], [['simple']]);
    expect(csv).toBe('x\r\nsimple\r\n');
  });
});
