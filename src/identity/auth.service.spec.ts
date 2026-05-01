import { UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@generated/prisma';
import { AuthService } from './auth.service';
import { AUDIT_EVENT } from '../shared/events/audit.event';
import { USER_REPOSITORY } from './domain/ports/user.repository.port';
import { PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { TOKEN_ISSUER } from './domain/ports/token-issuer.port';
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
interface TokenMock {
  issue: jest.Mock;
}

function makeUser(): User {
  return User.rehydrate({
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN' as UserRole,
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let repo: RepoMock;
  let hasher: HasherMock;
  let tokens: TokenMock;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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
          useValue: { hash: jest.fn(), verify: jest.fn() } as HasherMock,
        },
        {
          provide: TOKEN_ISSUER,
          useValue: { issue: jest.fn() } as TokenMock,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    repo = module.get<RepoMock>(USER_REPOSITORY);
    hasher = module.get<HasherMock>(PASSWORD_HASHER);
    tokens = module.get<TokenMock>(TOKEN_ISSUER);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('signIn', () => {
    const dto = { email: 'john@example.com', password: 'password123' };

    it('returns access token when credentials are valid', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      hasher.verify.mockResolvedValue(true);
      tokens.issue.mockResolvedValue('jwt-token');

      const result = await service.signIn(dto);

      expect(result).toEqual({ accessToken: 'jwt-token' });
      expect(tokens.issue).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'john@example.com',
        role: 'ADMIN',
      });
    });

    it('throws UnauthorizedException when user not found', async () => {
      repo.findByEmail.mockResolvedValue(null);
      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(hasher.verify).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when password invalid', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      hasher.verify.mockResolvedValue(false);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(tokens.issue).not.toHaveBeenCalled();
    });

    it('verifies password against the stored hash', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      hasher.verify.mockResolvedValue(true);
      tokens.issue.mockResolvedValue('jwt-token');

      await service.signIn(dto);

      expect(hasher.verify).toHaveBeenCalledWith(
        'password123',
        'hashed-password',
      );
    });

    it('emits AUTH_LOGIN audit event after successful sign-in', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      hasher.verify.mockResolvedValue(true);
      tokens.issue.mockResolvedValue('jwt-token');

      await service.signIn(dto);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_EVENT,
        expect.objectContaining({
          action: 'AUTH_LOGIN',
          entityId: 'user-1',
          userId: 'user-1',
          metadata: { email: 'john@example.com' },
        }),
      );
    });

    it('does not emit when user not found', async () => {
      repo.findByEmail.mockResolvedValue(null);
      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('does not emit when password invalid', async () => {
      repo.findByEmail.mockResolvedValue(makeUser());
      hasher.verify.mockResolvedValue(false);
      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
