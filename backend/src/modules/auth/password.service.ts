import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

const ARGON_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MiB (OWASP recommended minimum)
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, ARGON_OPTIONS);
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain).catch(() => false);
  }

  async needsRehash(hash: string): Promise<boolean> {
    return argon2.needsRehash(hash, ARGON_OPTIONS);
  }
}
