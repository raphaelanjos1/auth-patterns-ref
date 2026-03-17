import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';

@Injectable()
export class HashingService {
  private readonly pepper = process.env.ARGON2_PEPPER!;

  async hash(password: string): Promise<string> {
    const pepperedPassword = password + this.pepper;
    const salt = randomBytes(16);

    return argon2.hash(pepperedPassword, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterações/passagens
      parallelism: 4, // 4 threads
      salt,
    });
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const pepperedPassword = password + this.pepper;

    return argon2.verify(hash, pepperedPassword);
  }
}
