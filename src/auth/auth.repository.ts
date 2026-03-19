import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithPassword(email: string) {
    return this.prisma.client.user.findUnique({
      where: { email },
    });
  }
}
