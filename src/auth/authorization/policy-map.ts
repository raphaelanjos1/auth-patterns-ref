import type { UserRole } from '@generated/prisma';
import { Action } from './action.enum';
import { Subject } from './subject.enum';

export interface Permission {
  action: Action;
  subject: Subject;
}

export const POLICY_MAP: Record<UserRole, Permission[]> = {
  ADMIN: [
    { action: Action.CREATE, subject: Subject.USER },
    { action: Action.READ, subject: Subject.USER },
    { action: Action.UPDATE, subject: Subject.USER },
    { action: Action.DELETE, subject: Subject.USER },
  ],
  MANAGER: [
    { action: Action.CREATE, subject: Subject.USER },
    { action: Action.READ, subject: Subject.USER },
    { action: Action.UPDATE, subject: Subject.USER },
  ],
  USER: [{ action: Action.READ, subject: Subject.USER }],
};
