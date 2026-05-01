import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@generated/prisma';
import { UserService } from './user.service';
import { AUDIT_EVENT } from '../shared/events/audit.event';
import { USER_REPOSITORY } from './domain/ports/user.repository.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { User } from './domain/user.entity';

interface RepoMock {
  findById: jest.Mock;
  findByEmail: jest.Mock;
  findAll: jest.Mock;
  save: jest.Mock;
  delete: jest.Mock;
}

interface HasherMock {
  hash: jest.Mock;
  verify: jest.Mock;
}

function makeUser(
  overrides: Partial<{
    id: string;
    fullName: string;
    email: string;
    passwordHash: string;
    role: UserRole;
  }> = {},
): User {
  return User.rehydrate({
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN' as UserRole,
    ...overrides,
  });
}

describe('UserService', () => {
  let service: UserService;
  let repo: RepoMock;
  let hasher: HasherMock;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
          } as RepoMock,
        },
        {
          provide: PASSWORD_HASHER,
          useValue: {
            hash: jest.fn().mockResolvedValue('hashed-password'),
            verify: jest.fn(),
          } as HasherMock,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserService);
    repo = module.get<RepoMock>(USER_REPOSITORY);
    hasher = module.get<HasherMock>(PASSWORD_HASHER);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('findById', () => {
    it('returns user view when found', async () => {
      repo.findById.mockResolvedValue(makeUser());

      const result = await service.findById('user-1');

      expect(result).toEqual({
        id: 'user-1',
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
      });
    });

    it('throws NotFoundException when user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findById('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns paginated results with meta', async () => {
      repo.findAll.mockResolvedValue({ data: [makeUser()], total: 1 });

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.data).toEqual([
        {
          id: 'user-1',
          fullName: 'John Doe',
          email: 'john@example.com',
          role: 'ADMIN',
        },
      ]);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('defaults page to 1 and pageSize to 10', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 });
      await service.findAll({});
      expect(repo.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        search: undefined,
      });
    });

    it('caps pageSize at 100', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 });
      await service.findAll({ pageSize: 500 });
      expect(repo.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
        search: undefined,
      });
    });

    it('calculates totalPages correctly', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 25 });
      const result = await service.findAll({ page: 1, pageSize: 10 });
      expect(result.meta.totalPages).toBe(3);
    });

    it('passes search param to repository', async () => {
      repo.findAll.mockResolvedValue({ data: [], total: 0 });
      await service.findAll({ search: 'john' });
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'john' }),
      );
    });
  });

  describe('create', () => {
    const dto = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      role: 'USER' as UserRole,
    };

    it('creates a user when email is not taken', async () => {
      repo.findByEmail.mockResolvedValue(null);

      const result = await service.create(dto);

      expect(result.email).toBe('jane@example.com');
      expect(result.fullName).toBe('Jane Doe');
      expect(result.role).toBe('USER');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('throws ConflictException when email already in use', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('hashes the password via the port', async () => {
      repo.findByEmail.mockResolvedValue(null);
      await service.create(dto);
      expect(hasher.hash).toHaveBeenCalledWith('password123');
    });

    it('emits USER_CREATED audit event with performedBy', async () => {
      repo.findByEmail.mockResolvedValue(null);

      await service.create(dto, 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        expect.objectContaining({
          action: 'USER_CREATED',
          userId: 'admin-1',
          metadata: {
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            role: 'USER',
          },
        }),
      );
    });

    it('does not emit audit event when creation fails', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the user when found', async () => {
      repo.findById.mockResolvedValue(makeUser());

      const result = await service.update('user-1', {
        fullName: 'John Updated',
      });

      expect(result.fullName).toBe('John Updated');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('x', { fullName: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('emits USER_UPDATED with field changes', async () => {
      repo.findById.mockResolvedValue(makeUser());

      await service.update('user-1', { fullName: 'John Updated' }, 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        expect.objectContaining({
          action: 'USER_UPDATED',
          entityId: 'user-1',
          userId: 'admin-1',
          metadata: {
            changes: [
              { field: 'fullName', from: 'John Doe', to: 'John Updated' },
            ],
          },
        }),
      );
    });

    it('does not emit when no fields actually change', async () => {
      repo.findById.mockResolvedValue(makeUser());
      await service.update('user-1', { fullName: 'John Doe' });
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does not emit when user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.update('x', { fullName: 'Y' })).rejects.toThrow(
        NotFoundException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the user when found', async () => {
      repo.findById.mockResolvedValue(makeUser());
      await service.delete('user-1');
      expect(repo.delete).toHaveBeenCalledWith('user-1');
    });

    it('throws NotFoundException when user does not exist', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete('x')).rejects.toThrow(NotFoundException);
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('emits USER_DELETED with snapshot', async () => {
      repo.findById.mockResolvedValue(makeUser());
      await service.delete('user-1', 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        expect.objectContaining({
          action: 'USER_DELETED',
          entityId: 'user-1',
          userId: 'admin-1',
          metadata: {
            fullName: 'John Doe',
            email: 'john@example.com',
            role: 'ADMIN',
          },
        }),
      );
    });

    it('does not emit when user not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.delete('x')).rejects.toThrow(NotFoundException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
