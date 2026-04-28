import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@generated/prisma';
import type { Request } from 'express';
import { AbilityFactory } from './ability-factory';
import {
  PERMISSIONS_KEY,
  type PermissionRequirement,
} from './check-permissions.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request['user'] as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    const ability = this.abilityFactory.createForRole(user.role);

    if (ability.cannot(requirement.action, requirement.subject)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
