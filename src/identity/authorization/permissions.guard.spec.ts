import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { AbilityFactory } from './ability-factory';
import { Action } from './action.enum';
import { Subject } from './subject.enum';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Reflector>;
  let abilityFactory: jest.Mocked<AbilityFactory>;

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
          provide: AbilityFactory,
          useValue: { createForRole: jest.fn() },
        },
      ],
    }).compile();

    guard = module.get(PermissionsGuard);
    reflector = module.get<jest.Mocked<Reflector>>(Reflector);
    abilityFactory = module.get<jest.Mocked<AbilityFactory>>(AbilityFactory);
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
    abilityFactory.createForRole.mockReturnValue({
      can: () => false,
      cannot: () => true,
    });
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
    abilityFactory.createForRole.mockReturnValue({
      can: () => true,
      cannot: () => false,
    });
    const context = createMockContext({
      sub: 'user-1',
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should create ability for the correct user role', () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: Action.READ,
      subject: Subject.USER,
    });
    abilityFactory.createForRole.mockReturnValue({
      can: () => true,
      cannot: () => false,
    });
    const context = createMockContext({
      sub: 'user-1',
      email: 'manager@example.com',
      role: 'MANAGER',
    });

    guard.canActivate(context);

    expect(abilityFactory.createForRole).toHaveBeenCalledWith('MANAGER');
  });
});
