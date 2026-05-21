import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import type { IUserCredentialsReader } from '../../user/domain/ports/user-credentials-reader.port';

@Injectable()
export class AuthRepository implements IUserCredentialsReader {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithPassword(email: string) {
    return this.prisma.client.user.findUnique({
      where: { email },
    });
  }
}
