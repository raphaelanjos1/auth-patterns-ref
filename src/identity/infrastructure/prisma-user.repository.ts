/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@generated/prisma';
import { PrismaService } from '../../shared/database/prisma.service';
import { User } from '../domain/user.entity';
import {
  FindAllParams,
  FindAllResult,
  IUserRepository,
} from '../domain/ports/user.repository.port';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.client.user.findUnique({ where: { id } });
    return row ? User.rehydrate(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.client.user.findUnique({ where: { email } });
    return row ? User.rehydrate(row) : null;
  }

  async findAll(params: FindAllParams): Promise<FindAllResult> {
    const { skip, take, search } = params;
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.client.user.findMany({
        where,
        skip,
        take,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.client.user.count({ where }),
    ]);

    return { data: rows.map((r) => User.rehydrate(r)), total };
  }

  async save(user: User): Promise<void> {
    const data = user.toPersistence();
    await this.prisma.client.user.upsert({
      where: { id: data.id },
      create: data,
      update: {
        fullName: data.fullName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.user.delete({ where: { id } });
  }
}
