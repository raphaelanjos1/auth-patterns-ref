/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.client.user.findUnique({
      where: { email },
      omit: { passwordHash: true },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.client.user.create({
      data,
      omit: { passwordHash: true },
    });
  }
}
