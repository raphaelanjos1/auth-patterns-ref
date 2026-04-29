import { DomainEvent } from './domain-event';

export class UserSignedInEvent extends DomainEvent {
  readonly action = 'AUTH_LOGIN';

  constructor(
    public readonly entityId: string,
    private readonly email: string,
  ) {
    super();
  }

  get performedBy(): string {
    return this.entityId;
  }

  get metadata(): Record<string, unknown> {
    return { email: this.email };
  }
}
