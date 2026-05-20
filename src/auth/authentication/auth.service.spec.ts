import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import {
  USER_CREDENTIALS_READER,
  type IUserCredentialsReader,
} from '../../user/domain/ports/user-credentials-reader.port';
import { HashingService } from '../../shared/hashing/hashing.service';
import { AUDIT_EVENT, AuditEvent } from '../../audit-log/events/audit.event';

describe('AuthService', () => {
  let service: AuthService;
  let credentialsReader: jest.Mocked<IUserCredentialsReader>;
  let hashingService: jest.Mocked<HashingService>;
  let jwtService: jest.Mocked<JwtService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUser = {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: USER_CREDENTIALS_READER,
          useValue: { findByEmailWithPassword: jest.fn() },
        },
        {
          provide: HashingService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    credentialsReader = module.get<jest.Mocked<IUserCredentialsReader>>(
      USER_CREDENTIALS_READER,
    );
    hashingService = module.get<jest.Mocked<HashingService>>(HashingService);
    jwtService = module.get<jest.Mocked<JwtService>>(JwtService);
    eventEmitter = module.get<jest.Mocked<EventEmitter2>>(EventEmitter2);
  });

  describe('signIn', () => {
    const dto = { email: 'john@example.com', password: 'password123' };

    it('should return an access token when credentials are valid', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.signIn(dto);

      expect(result).toEqual({ accessToken: 'jwt-token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(hashingService.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(false);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should verify password against the stored hash', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      await service.signIn(dto);

      expect(hashingService.verify).toHaveBeenCalledWith(
        dto.password,
        mockUser.passwordHash,
      );
    });

    it('should emit AUTH_LOGIN audit event after successful sign-in', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      await service.signIn(dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        new AuditEvent('AUTH_LOGIN', mockUser.id, mockUser.id, {
          email: mockUser.email,
        }),
      );
    });

    it('should not emit audit event when user is not found', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not emit audit event when password is invalid', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(false);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
