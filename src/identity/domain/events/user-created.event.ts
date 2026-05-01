import type { UserRole } from '@generated/prisma';
import { DomainEvent } from './domain-event';

export class UserCreatedEvent extends DomainEvent {
  readonly action = 'USER_CREATED';

  constructor(
    public readonly entityId: string,
    public readonly performedBy: string | null,
    private readonly snapshot: {
      fullName: string;
      email: string;
      role: UserRole;
    },
  ) {
    super();
  }

  get metadata(): Record<string, unknown> {
    return { ...this.snapshot };
  }
}
