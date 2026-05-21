import { Injectable } from '@nestjs/common';
import type { JwtPayload } from '../../shared/contracts';
import type { IPermissionChecker } from '../../permissions-api/permission-checker.port';
import type { PermissionRequirement } from './check-permissions.decorator';
import { AbilityFactory } from './ability-factory';

@Injectable()
export class AbilityPermissionChecker implements IPermissionChecker {
  constructor(private readonly abilityFactory: AbilityFactory) {}

  can(user: JwtPayload, requirement: PermissionRequirement): boolean {
    const ability = this.abilityFactory.createForRole(user.role);
    return ability.can(requirement.action, requirement.subject);
  }
}
