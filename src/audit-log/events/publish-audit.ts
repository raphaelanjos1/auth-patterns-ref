import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_CONTRACT_VERSION } from '../contracts/audit-contract';
import type { AuditAction } from './audit-actions';
import { AUDIT_EVENT, AuditEvent } from './audit.event';

export type PublishAuditPayload = {
  action: AuditAction;
  entityId: string | null;
  userId: string | null;
  metadata: Record<string, unknown> | null;
};

export function publishAudit(
  emitter: EventEmitter2,
  payload: PublishAuditPayload,
): void {
  emitter.emit(
    AUDIT_EVENT,
    new AuditEvent(
      payload.action,
      payload.entityId,
      payload.userId,
      payload.metadata,
      AUDIT_CONTRACT_VERSION,
    ),
  );
}
