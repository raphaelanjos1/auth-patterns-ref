import type { JwtPayload } from '../shared/contracts';
import type { PermissionRequirement } from '../auth/authorization/check-permissions.decorator';

export interface IPermissionChecker {
  can(user: JwtPayload, requirement: PermissionRequirement): boolean;
}
