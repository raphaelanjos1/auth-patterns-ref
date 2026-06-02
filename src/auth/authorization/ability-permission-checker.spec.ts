import { AbilityPermissionChecker } from './ability-permission-checker';
import { AbilityFactory } from './ability-factory';
import { Action, Subject } from '../../permissions-api';

describe('AbilityPermissionChecker', () => {
  let checker: AbilityPermissionChecker;

  beforeEach(() => {
    checker = new AbilityPermissionChecker(new AbilityFactory());
  });

  it('should allow ADMIN to CREATE USER', () => {
    expect(
      checker.can(
        { sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' },
        { action: Action.CREATE, subject: Subject.USER },
      ),
    ).toBe(true);
  });

  it('should deny USER from CREATE USER', () => {
    expect(
      checker.can(
        { sub: 'user-1', email: 'user@example.com', role: 'USER' },
        { action: Action.CREATE, subject: Subject.USER },
      ),
    ).toBe(false);
  });
});
