import { Injectable } from '@nestjs/common';
import type { UserRole } from '@generated/prisma';
import { Action } from './action.enum';
import { POLICY_MAP } from './policy-map';
import { Subject } from './subject.enum';

export interface Ability {
  can(action: Action, subject: Subject): boolean;
  cannot(action: Action, subject: Subject): boolean;
}

@Injectable()
export class AbilityFactory {
  createForRole(role: UserRole): Ability {
    const permissions = POLICY_MAP[role] ?? [];

    const can = (action: Action, subject: Subject): boolean =>
      permissions.some((p) => p.action === action && p.subject === subject);

    const cannot = (action: Action, subject: Subject): boolean =>
      !can(action, subject);

    return { can, cannot };
  }
}
