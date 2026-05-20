import type { AuditAction } from './audit-actions';

export const AUDIT_EVENT = 'audit.log';

export class AuditEvent {
  constructor(
    public readonly action: AuditAction,
    public readonly entityId: string | null,
    public readonly userId: string | null,
    public readonly metadata: Record<string, unknown> | null,
  ) {}
}
