import { AUDIT_CONTRACT_VERSION } from './audit-contract';
import { AuditEvent } from '../events/audit.event';
import { publishAudit } from '../events/publish-audit';
import { EventEmitter2 } from '@nestjs/event-emitter';

const V1_REQUIRED_KEYS = [
  'action',
  'entityId',
  'userId',
  'metadata',
  'schemaVersion',
] as const;

function serializeAuditEvent(event: AuditEvent): Record<string, unknown> {
  return {
    action: event.action,
    entityId: event.entityId,
    userId: event.userId,
    metadata: event.metadata,
    schemaVersion: event.schemaVersion,
  };
}

describe('AuditEvent v1 contract', () => {
  it('serializes to object with all v1 required fields', () => {
    const event = new AuditEvent(
      'USER_CREATED',
      'entity-1',
      'actor-1',
      { email: 'a@b.c' },
    );

    const payload = serializeAuditEvent(event);

    for (const key of V1_REQUIRED_KEYS) {
      expect(payload).toHaveProperty(key);
    }
    expect(payload.schemaVersion).toBe(AUDIT_CONTRACT_VERSION);
    expect(payload.action).toBe('USER_CREATED');
    expect(payload.entityId).toBe('entity-1');
    expect(payload.userId).toBe('actor-1');
    expect(payload.metadata).toEqual({ email: 'a@b.c' });
  });

  it('publishAudit emits event matching v1 shape', () => {
    const emitter = new EventEmitter2();
    const handler = jest.fn();
    emitter.on('audit.log', handler);

    publishAudit(emitter, {
      action: 'AUTH_LOGIN',
      entityId: 'u1',
      userId: 'u1',
      metadata: { email: 'u@test.com' },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as AuditEvent;
    const payload = serializeAuditEvent(event);

    for (const key of V1_REQUIRED_KEYS) {
      expect(payload).toHaveProperty(key);
    }
    expect(payload.schemaVersion).toBe('1.0.0');
  });
});
