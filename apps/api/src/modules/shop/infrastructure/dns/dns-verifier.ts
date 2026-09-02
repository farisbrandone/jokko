import { resolveTxt } from 'node:dns/promises';
import type { DnsVerifier } from '../../domain/ports/dns-verifier';

/** Résolution TXT réelle (production). Une erreur DNS ⇒ liste vide. */
export class NodeDnsVerifier implements DnsVerifier {
  async txtRecords(name: string): Promise<string[]> {
    try {
      const chunks = await resolveTxt(name);
      return chunks.map((parts) => parts.join(''));
    } catch {
      return [];
    }
  }
}

/**
 * Table de résolution en mémoire — alimentée uniquement en dev / CI
 * (`DNS_STUB_ENABLED=1`). Les tests y injectent l'enregistrement attendu.
 */
export const __dnsStubTable = new Map<string, string[]>();

export class StubDnsVerifier implements DnsVerifier {
  async txtRecords(name: string): Promise<string[]> {
    return __dnsStubTable.get(name.toLowerCase()) ?? [];
  }
}
