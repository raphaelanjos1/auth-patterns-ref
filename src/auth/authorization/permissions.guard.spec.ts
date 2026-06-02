import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { AbilityPermissionChecker } from './ability-permission-checker';
import { Action, Subject } from '../../permissions-api';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let checker: jest.Mocked<AbilityPermissionChecker>;

  function createMockContext(user?: Record<string, unknown>): ExecutionContext {
    const request: Record<string, unknown> = { user };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: jest.fn() },
        },
        {
          provide: AbilityPermissionChecker,
          useValue: { can: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(PermissionsGuard);
    reflector = module.get<jest.Mocked<Reflector>>(Reflector);
    checker = module.get<jest.Mocked<AbilityPermissionChecker>>(
      AbilityPermissionChecker,
    );
  });

  it('should allow access when no permission requirement is set', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user is not present on request', () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: Action.READ,
      subject: Subject.USER,
    });
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user lacks required permission', () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: Action.DELETE,
      subject: Subject.USER,
    });
    checker.can.mockReturnValue(false);
    const context = createMockContext({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'USER',
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow access when user has the required permission', () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: Action.READ,
      subject: Subject.USER,
    });
    checker.can.mockReturnValue(true);
    const context = createMockContext({
      sub: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should delegate permission check to checker with user and requirement', () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: Action.READ,
      subject: Subject.USER,
    });
    checker.can.mockReturnValue(true);
    const user = {
      sub: 'user-1',
      email: 'manager@example.com',
      role: 'MANAGER',
    };
    const context = createMockContext(user);

    guard.canActivate(context);

    expect(checker.can).toHaveBeenCalledWith(user, {
      action: Action.READ,
      subject: Subject.USER,
    });
  });
});
