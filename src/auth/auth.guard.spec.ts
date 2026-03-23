import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let reflector: jest.Mocked<Reflector>;

  const mockPayload = {
    sub: 'user-1',
    email: 'john@example.com',
    role: 'ADMIN',
  };

  function createMockContext(authorization?: string): ExecutionContext {
    const request: Record<string, unknown> = {
      headers: { authorization },
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: { verifyAsync: jest.fn() },
        },
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(AuthGuard);
    jwtService = module.get<jest.Mocked<JwtService>>(JwtService);
    reflector = module.get<jest.Mocked<Reflector>>(Reflector);
  });

  it('should allow access to public routes without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when no token is provided', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext();

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when authorization header is not Bearer', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = createMockContext('Basic some-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException when token verification fails', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));
    const context = createMockContext('Bearer invalid-token');

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should attach user payload to request when token is valid', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue(mockPayload);
    const context = createMockContext('Bearer valid-token');

    const result = await guard.canActivate(context);
    const request: Record<string, unknown> = context
      .switchToHttp()
      .getRequest();

    expect(result).toBe(true);
    expect(request['user']).toEqual(mockPayload);
  });
});
