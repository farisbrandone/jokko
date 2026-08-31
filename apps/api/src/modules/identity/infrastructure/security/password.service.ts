import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

/**
 * Hachage des mots de passe. bcrypt (coût 12) pour l'instant ; un adaptateur
 * argon2id le remplacera au durcissement, l'interface reste la même.
 */
@Injectable()
export class PasswordService {
  private readonly rounds = 12;

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
