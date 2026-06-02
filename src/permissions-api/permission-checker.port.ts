import type { JwtPayload } from '../shared/contracts';
import type { PermissionRequirement } from './check-permissions.decorator';

export interface IPermissionChecker {
  can(user: JwtPayload, requirement: PermissionRequirement): boolean;
}
