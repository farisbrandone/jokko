export const DNS_VERIFIER = Symbol('DNS_VERIFIER');

/** Lecture des enregistrements TXT d'un nom d'hôte (contrôle de propriété du domaine). */
export interface DnsVerifier {
  txtRecords(name: string): Promise<string[]>;
}
