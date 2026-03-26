import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { AuditAction } from '@generated/prisma';
import { AuditLogRepository } from './audit-log.repository';
import { AUDIT_EVENT, AuditEvent } from './events/audit.event';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  @OnEvent(AUDIT_EVENT, { async: true })
  async handleAuditEvent(event: AuditEvent): Promise<void> {
    try {
      await this.auditLogRepository.create({
        action: event.action as AuditAction,
        entityId: event.entityId ?? undefined,
        userId: event.userId ?? undefined,
        metadata: event.metadata ?? undefined,
      });
    } catch (error) {
      this.logger.error('Failed to write audit log', error);
    }
  }
}
