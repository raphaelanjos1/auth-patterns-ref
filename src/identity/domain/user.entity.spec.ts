import { UserRole } from '@generated/prisma';
import { User } from './user.entity';
import { IPasswordHasher } from './ports/password-hasher.port';
import { InvalidCredentialsError, InvalidUserNameError } from './errors';
import { InvalidEmailError } from './value-objects/email.vo';
import { UserCreatedEvent } from './events/user-created.event';
import { UserUpdatedEvent } from './events/user-updated.event';
import { UserDeletedEvent } from './events/user-deleted.event';
import { UserSignedInEvent } from './events/user-signed-in.event';

const fakeHasher = (overrides: Partial<IPasswordHasher> = {}): IPasswordHasher => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  verify: jest.fn().mockResolvedValue(true),
  ...overrides,
});

function makeUser() {
  return User.rehydrate({
    id: 'u-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed',
    role: 'USER' as UserRole,
  });
}

describe('User entity', () => {
  describe('register', () => {
    it('creates a user, hashes password, emits UserCreatedEvent', async () => {
      const hasher = fakeHasher();
      const user = await User.register(
        { fullName: ' Jane ', email: 'JANE@Example.com', password: 'pw', role: 'USER' as UserRole },
        hasher,
        'admin-1',
      );

      expect(user.fullName).toBe('Jane');
      expect(user.email).toBe('jane@example.com');
      expect(user.role).toBe('USER');
      expect(hasher.hash).toHaveBeenCalledWith('pw');

      const events = user.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserCreatedEvent);
      expect(events[0].performedBy).toBe('admin-1');
    });

    it('rejects empty full name', async () => {
      await expect(
        User.register(
          { fullName: '   ', email: 'a@b.com', password: 'x', role: 'USER' as UserRole },
          fakeHasher(),
        ),
      ).rejects.toThrow(InvalidUserNameError);
    });

    it('rejects invalid email', async () => {
      await expect(
        User.register(
          { fullName: 'X', email: 'not-an-email', password: 'x', role: 'USER' as UserRole },
          fakeHasher(),
        ),
      ).rejects.toThrow(InvalidEmailError);
    });
  });

  describe('authenticate', () => {
    it('emits UserSignedInEvent on success', async () => {
      const user = makeUser();
      await user.authenticate('pw', fakeHasher({ verify: jest.fn().mockResolvedValue(true) }));

      const events = user.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserSignedInEvent);
    });

    it('throws InvalidCredentialsError on bad password', async () => {
      const user = makeUser();
      await expect(
        user.authenticate('wrong', fakeHasher({ verify: jest.fn().mockResolvedValue(false) })),
      ).rejects.toThrow(InvalidCredentialsError);

      expect(user.pullEvents()).toHaveLength(0);
    });
  });

  describe('applyUpdate', () => {
    it('updates fullName and emits UserUpdatedEvent with diff', () => {
      const user = makeUser();
      user.applyUpdate({ fullName: 'New Name' }, 'admin-1');

      expect(user.fullName).toBe('New Name');
      const events = user.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserUpdatedEvent);
      expect((events[0] as UserUpdatedEvent).changes).toEqual([
        { field: 'fullName', from: 'John Doe', to: 'New Name' },
      ]);
    });

    it('updates role and emits diff', () => {
      const user = makeUser();
      user.applyUpdate({ role: 'ADMIN' as UserRole }, null);

      expect(user.role).toBe('ADMIN');
      const events = user.pullEvents();
      expect((events[0] as UserUpdatedEvent).changes).toEqual([
        { field: 'role', from: 'USER', to: 'ADMIN' },
      ]);
    });

    it('emits no event when nothing changes', () => {
      const user = makeUser();
      user.applyUpdate({ fullName: 'John Doe', role: 'USER' as UserRole });
      expect(user.pullEvents()).toHaveLength(0);
    });
  });

  describe('markDeleted', () => {
    it('emits UserDeletedEvent with snapshot', () => {
      const user = makeUser();
      user.markDeleted('admin-1');

      const events = user.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(UserDeletedEvent);
      expect(events[0].metadata).toEqual({
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
      });
    });
  });

  describe('toJSON', () => {
    it('returns view without passwordHash and email as string', () => {
      const user = makeUser();
      expect(JSON.parse(JSON.stringify(user))).toEqual({
        id: 'u-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
      });
    });
  });

  describe('pullEvents', () => {
    it('drains accumulated events and clears the buffer', async () => {
      const user = await User.register(
        { fullName: 'X', email: 'x@y.com', password: 'p', role: 'USER' as UserRole },
        fakeHasher(),
      );
      expect(user.pullEvents()).toHaveLength(1);
      expect(user.pullEvents()).toHaveLength(0);
    });
  });
});
