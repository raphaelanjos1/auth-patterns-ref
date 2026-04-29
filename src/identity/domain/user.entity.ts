import { randomUUID } from 'node:crypto';
import { UserRole } from '@generated/prisma';
import { Email } from './value-objects/email.vo';
import { IPasswordHasher } from './ports/password-hasher.port';
import { DomainEvent } from './events/domain-event';
import { UserCreatedEvent } from './events/user-created.event';
import { UserUpdatedEvent, UserChange } from './events/user-updated.event';
import { UserDeletedEvent } from './events/user-deleted.event';
import { UserSignedInEvent } from './events/user-signed-in.event';
import { InvalidCredentialsError, InvalidUserNameError } from './errors';

export interface UserPersistence {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface UserView {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface RegisterUserInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  fullName?: string;
  role?: UserRole;
}

export class User {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: string,
    private _fullName: string,
    private _email: Email,
    private _passwordHash: string,
    private _role: UserRole,
  ) {}

  static async register(
    input: RegisterUserInput,
    hasher: IPasswordHasher,
    performedBy: string | null = null,
  ): Promise<User> {
    const fullName = User.normalizeName(input.fullName);
    const email = Email.create(input.email);
    const passwordHash = await hasher.hash(input.password);
    const user = new User(randomUUID(), fullName, email, passwordHash, input.role);
    user.events.push(
      new UserCreatedEvent(user.id, performedBy, {
        fullName: user._fullName,
        email: user._email.value,
        role: user._role,
      }),
    );
    return user;
  }

  static rehydrate(raw: UserPersistence): User {
    return new User(
      raw.id,
      raw.fullName,
      Email.create(raw.email),
      raw.passwordHash,
      raw.role,
    );
  }

  get fullName(): string {
    return this._fullName;
  }

  get email(): string {
    return this._email.value;
  }

  get role(): UserRole {
    return this._role;
  }

  async authenticate(plain: string, hasher: IPasswordHasher): Promise<void> {
    const ok = await hasher.verify(plain, this._passwordHash);
    if (!ok) throw new InvalidCredentialsError();
    this.events.push(new UserSignedInEvent(this.id, this._email.value));
  }

  applyUpdate(input: UpdateUserInput, performedBy: string | null = null): void {
    const changes: UserChange[] = [];

    if (input.fullName !== undefined) {
      const next = User.normalizeName(input.fullName);
      if (next !== this._fullName) {
        changes.push({ field: 'fullName', from: this._fullName, to: next });
        this._fullName = next;
      }
    }

    if (input.role !== undefined && input.role !== this._role) {
      changes.push({ field: 'role', from: this._role, to: input.role });
      this._role = input.role;
    }

    if (changes.length > 0) {
      this.events.push(new UserUpdatedEvent(this.id, performedBy, changes));
    }
  }

  markDeleted(performedBy: string | null = null): void {
    this.events.push(
      new UserDeletedEvent(this.id, performedBy, {
        fullName: this._fullName,
        email: this._email.value,
        role: this._role,
      }),
    );
  }

  pullEvents(): DomainEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  toPersistence(): UserPersistence {
    return {
      id: this.id,
      fullName: this._fullName,
      email: this._email.value,
      passwordHash: this._passwordHash,
      role: this._role,
    };
  }

  toView(): UserView {
    return {
      id: this.id,
      fullName: this._fullName,
      email: this._email.value,
      role: this._role,
    };
  }

  toJSON(): UserView {
    return this.toView();
  }

  private static normalizeName(raw: string): string {
    const trimmed = raw.trim();
    if (trimmed.length === 0) throw new InvalidUserNameError();
    return trimmed;
  }
}
