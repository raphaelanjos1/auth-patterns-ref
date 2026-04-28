import { SetMetadata } from '@nestjs/common';
import type { Action } from './action.enum';
import type { Subject } from './subject.enum';

export interface PermissionRequirement {
  action: Action;
  subject: Subject;
}

export const PERMISSIONS_KEY = 'permissions';
export const CheckPermissions = (requirement: PermissionRequirement) =>
  SetMetadata(PERMISSIONS_KEY, requirement);
