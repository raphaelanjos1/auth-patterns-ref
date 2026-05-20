jest.mock('@generated/prisma', () =>
  jest.requireActual<typeof import('@generated/prisma')>(
    '../../../generated/prisma/enums',
  ),
);

import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import {
  USER_DIRECTORY,
  type IUserDirectory,
} from '../domain/ports/user-directory.port';
import { HashingService } from '../../shared/hashing/hashing.service';
import { AUDIT_EVENT, AuditEvent } from '../../audit-log/events/audit.event';
import { UserRole } from '@generated/prisma';

describe('UserService', () => {
  let service: UserService;
  let userDirectory: jest.Mocked<IUserDirectory>;
  let hashingService: jest.Mocked<HashingService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser = {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    role: 'ADMIN' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_DIRECTORY,
          useValue: {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: HashingService,
          useValue: { hash: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UserService);
    userDirectory = module.get<jest.Mocked<IUserDirectory>>(USER_DIRECTORY);
    hashingService = module.get<jest.Mocked<HashingService>>(HashingService);
    eventEmitter = module.get<jest.Mocked<EventEmitter2>>(EventEmitter2);
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      userDirectory.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-1');

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user is not found', async () => {
      userDirectory.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated results with meta', async () => {
      userDirectory.findAll.mockResolvedValue({
        data: [mockUser],
        total: 1,
      });

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.data).toEqual([mockUser]);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('should default page to 1 and pageSize to 10', async () => {
      userDirectory.findAll.mockResolvedValue({ data: [], total: 0 });

      await service.findAll({});

      expect(userDirectory.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        search: undefined,
      });
    });

    it('should cap pageSize at 100', async () => {
      userDirectory.findAll.mockResolvedValue({ data: [], total: 0 });

      await service.findAll({ pageSize: 500 });

      expect(userDirectory.findAll).toHaveBeenCalledWith({
        skip: 0,
        take: 100,
        search: undefined,
      });
    });

    it('should calculate totalPages correctly', async () => {
      userDirectory.findAll.mockResolvedValue({ data: [], total: 25 });

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.meta.totalPages).toBe(3);
    });

    it('should pass search parameter to repository', async () => {
      userDirectory.findAll.mockResolvedValue({ data: [], total: 0 });

      await service.findAll({ search: 'john' });

      expect(userDirectory.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'john' }),
      );
    });
  });

  describe('create', () => {
    const createDto = {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      role: UserRole.USER,
    };

    it('should create a user when email is not taken', async () => {
      userDirectory.findByEmail.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      userDirectory.create.mockResolvedValue({
        id: 'user-2',
        fullName: createDto.fullName,
        email: createDto.email,
        role: createDto.role,
      });

      const result = await service.create(createDto);

      expect(result.email).toBe(createDto.email);
      expect(userDirectory.create).toHaveBeenCalledWith({
        fullName: createDto.fullName,
        email: createDto.email,
        passwordHash: 'hashed-password',
        role: createDto.role,
      });
    });

    it('should throw ConflictException when email is already in use', async () => {
      userDirectory.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(userDirectory.create).not.toHaveBeenCalled();
    });

    it('should hash the password before storing', async () => {
      userDirectory.findByEmail.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      userDirectory.create.mockResolvedValue({ ...mockUser });

      await service.create(createDto);

      expect(hashingService.hash).toHaveBeenCalledWith(createDto.password);
    });

    it('should emit USER_CREATED audit event after creation', async () => {
      const createdUser = {
        id: 'user-2',
        fullName: createDto.fullName,
        email: createDto.email,
        role: createDto.role,
      };
      userDirectory.findByEmail.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-password');
      userDirectory.create.mockResolvedValue(createdUser);

      await service.create(createDto, 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        new AuditEvent('USER_CREATED', 'user-2', 'admin-1', {
          fullName: createDto.fullName,
          email: createDto.email,
          role: createDto.role,
        }),
      );
    });

    it('should not emit audit event when creation fails', async () => {
      userDirectory.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createDto)).rejects.toThrow(
        ConflictException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const updateDto = { fullName: 'John Updated' };

    it('should update the user when found', async () => {
      userDirectory.findById.mockResolvedValue(mockUser);
      userDirectory.update.mockResolvedValue({
        ...mockUser,
        fullName: 'John Updated',
      });

      const result = await service.update('user-1', updateDto);

      expect(result.fullName).toBe('John Updated');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userDirectory.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(userDirectory.update).not.toHaveBeenCalled();
    });

    it('should emit USER_UPDATED audit event with changes', async () => {
      userDirectory.findById.mockResolvedValue(mockUser);
      userDirectory.update.mockResolvedValue({
        ...mockUser,
        fullName: 'John Updated',
      });

      await service.update('user-1', updateDto, 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        new AuditEvent('USER_UPDATED', 'user-1', 'admin-1', {
          changes: [
            { field: 'fullName', from: 'John Doe', to: 'John Updated' },
          ],
        }),
      );
    });

    it('should not emit audit event when user is not found', async () => {
      userDirectory.findById.mockResolvedValue(null);

      await expect(service.update('nonexistent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete the user when found', async () => {
      userDirectory.findById.mockResolvedValue(mockUser);
      userDirectory.delete.mockResolvedValue(mockUser);

      await service.delete('user-1');

      expect(userDirectory.delete).toHaveBeenCalledWith('user-1');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userDirectory.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(userDirectory.delete).not.toHaveBeenCalled();
    });

    it('should emit USER_DELETED audit event with user snapshot', async () => {
      userDirectory.findById.mockResolvedValue(mockUser);
      userDirectory.delete.mockResolvedValue(mockUser);

      await service.delete('user-1', 'admin-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        new AuditEvent('USER_DELETED', 'user-1', 'admin-1', {
          fullName: mockUser.fullName,
          email: mockUser.email,
          role: mockUser.role,
        }),
      );
    });

    it('should not emit audit event when user is not found', async () => {
      userDirectory.findById.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
