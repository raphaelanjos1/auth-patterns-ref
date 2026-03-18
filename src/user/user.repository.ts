/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.client.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.client.user.findUnique({
      where: { email },
      omit: { passwordHash: true },
    });
  }

  async findAll(params: { skip: number; take: number; search?: string }) {
    const { skip, take, search } = params;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        skip,
        take,
        omit: { passwordHash: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.client.user.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.client.user.create({
      data,
      omit: { passwordHash: true },
    });
  }
}
