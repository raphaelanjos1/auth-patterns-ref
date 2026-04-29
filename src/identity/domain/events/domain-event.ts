export abstract class DomainEvent {
  readonly occurredAt: Date = new Date();
  abstract readonly action: string;
  abstract readonly entityId: string;
  abstract readonly performedBy: string | null;
  abstract readonly metadata: Record<string, unknown>;
}
