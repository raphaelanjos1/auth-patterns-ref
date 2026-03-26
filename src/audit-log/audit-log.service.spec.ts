import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepository } from './audit-log.repository';
import { AuditEvent } from './events/audit.event';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<AuditLogRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: { create: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuditLogService);
    repository = module.get<jest.Mocked<AuditLogRepository>>(AuditLogRepository);
  });

  describe('handleAuditEvent', () => {
    it('should persist a USER_CREATED audit log', async () => {
      const event = new AuditEvent('USER_CREATED', 'user-1', 'admin-1', {
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'USER',
      });

      await service.handleAuditEvent(event);

      expect(repository.create).toHaveBeenCalledWith({
        action: 'USER_CREATED',
        entityId: 'user-1',
        userId: 'admin-1',
        metadata: { fullName: 'John Doe', email: 'john@example.com', role: 'USER' },
      });
    });

    it('should persist a USER_UPDATED audit log with changes', async () => {
      const event = new AuditEvent('USER_UPDATED', 'user-1', 'admin-1', {
        changes: [{ field: 'fullName', from: 'John', to: 'John Doe' }],
      });

      await service.handleAuditEvent(event);

      expect(repository.create).toHaveBeenCalledWith({
        action: 'USER_UPDATED',
        entityId: 'user-1',
        userId: 'admin-1',
        metadata: { changes: [{ field: 'fullName', from: 'John', to: 'John Doe' }] },
      });
    });

    it('should persist a USER_DELETED audit log with snapshot', async () => {
      const event = new AuditEvent('USER_DELETED', 'user-1', 'admin-1', {
        fullName: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
      });

      await service.handleAuditEvent(event);

      expect(repository.create).toHaveBeenCalledWith({
        action: 'USER_DELETED',
        entityId: 'user-1',
        userId: 'admin-1',
        metadata: { fullName: 'John Doe', email: 'john@example.com', role: 'ADMIN' },
      });
    });

    it('should persist an AUTH_LOGIN audit log', async () => {
      const event = new AuditEvent('AUTH_LOGIN', 'user-1', 'user-1', {
        email: 'john@example.com',
      });

      await service.handleAuditEvent(event);

      expect(repository.create).toHaveBeenCalledWith({
        action: 'AUTH_LOGIN',
        entityId: 'user-1',
        userId: 'user-1',
        metadata: { email: 'john@example.com' },
      });
    });

    it('should handle null entityId and userId', async () => {
      const event = new AuditEvent('USER_CREATED', null, null, { fullName: 'Test' });

      await service.handleAuditEvent(event);

      expect(repository.create).toHaveBeenCalledWith({
        action: 'USER_CREATED',
        entityId: undefined,
        userId: undefined,
        metadata: { fullName: 'Test' },
      });
    });

    it('should catch and log errors without propagating', async () => {
      repository.create.mockRejectedValue(new Error('Database connection failed'));
      const event = new AuditEvent('AUTH_LOGIN', 'user-1', 'user-1', { email: 'test@test.com' });

      await expect(service.handleAuditEvent(event)).resolves.not.toThrow();
    });
  });
});
