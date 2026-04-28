import type { UserRole } from '@generated/prisma';
import { AbilityFactory } from './ability-factory';
import { Action } from './action.enum';
import { Subject } from './subject.enum';

describe('AbilityFactory', () => {
  let factory: AbilityFactory;

  beforeEach(() => {
    factory = new AbilityFactory();
  });

  describe('ADMIN role', () => {
    it('should allow all CRUD actions on User', () => {
      const ability = factory.createForRole('ADMIN');

      expect(ability.can(Action.CREATE, Subject.USER)).toBe(true);
      expect(ability.can(Action.READ, Subject.USER)).toBe(true);
      expect(ability.can(Action.UPDATE, Subject.USER)).toBe(true);
      expect(ability.can(Action.DELETE, Subject.USER)).toBe(true);
    });
  });

  describe('MANAGER role', () => {
    it('should allow CREATE, READ, and UPDATE on User', () => {
      const ability = factory.createForRole('MANAGER');

      expect(ability.can(Action.CREATE, Subject.USER)).toBe(true);
      expect(ability.can(Action.READ, Subject.USER)).toBe(true);
      expect(ability.can(Action.UPDATE, Subject.USER)).toBe(true);
    });

    it('should deny DELETE on User', () => {
      const ability = factory.createForRole('MANAGER');

      expect(ability.cannot(Action.DELETE, Subject.USER)).toBe(true);
      expect(ability.can(Action.DELETE, Subject.USER)).toBe(false);
    });
  });

  describe('USER role', () => {
    it('should allow only READ on User', () => {
      const ability = factory.createForRole('USER');

      expect(ability.can(Action.READ, Subject.USER)).toBe(true);
    });

    it('should deny CREATE, UPDATE, and DELETE on User', () => {
      const ability = factory.createForRole('USER');

      expect(ability.cannot(Action.CREATE, Subject.USER)).toBe(true);
      expect(ability.cannot(Action.UPDATE, Subject.USER)).toBe(true);
      expect(ability.cannot(Action.DELETE, Subject.USER)).toBe(true);
    });
  });

  describe('unknown role', () => {
    it('should deny all actions for an unknown role', () => {
      const ability = factory.createForRole('UNKNOWN' as UserRole);

      expect(ability.cannot(Action.CREATE, Subject.USER)).toBe(true);
      expect(ability.cannot(Action.READ, Subject.USER)).toBe(true);
      expect(ability.cannot(Action.UPDATE, Subject.USER)).toBe(true);
      expect(ability.cannot(Action.DELETE, Subject.USER)).toBe(true);
    });
  });
});
