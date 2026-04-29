import { Injectable } from '@nestjs/common';
import { HashingService } from '../../shared/hashing/hashing.service';
import { IPasswordHasher } from '../domain/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  constructor(private readonly hashing: HashingService) {}

  hash(plain: string): Promise<string> {
    return this.hashing.hash(plain);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return this.hashing.verify(plain, hash);
  }
}
