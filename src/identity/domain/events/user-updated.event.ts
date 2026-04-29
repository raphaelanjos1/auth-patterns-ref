import { DomainEvent } from './domain-event';

export interface UserChange {
  field: string;
  from: unknown;
  to: unknown;
}

export class UserUpdatedEvent extends DomainEvent {
  readonly action = 'USER_UPDATED';

  constructor(
    public readonly entityId: string,
    public readonly performedBy: string | null,
    public readonly changes: UserChange[],
  ) {
    super();
  }

  get metadata(): Record<string, unknown> {
    return { changes: this.changes };
  }
}
