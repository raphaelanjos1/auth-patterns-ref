import { Injectable } from '@nestjs/common';
import type { AuditAction } from '@generated/prisma';
import { PrismaService } from '../shared/database/prisma.service';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    action: AuditAction;
    entityId?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.client.auditLog.create({ data });
  }
}
