import { HashingService } from './hashing.service';

describe('HashingService', () => {
  let service: HashingService;
  const originalEnv = process.env.ARGON2_PEPPER;

  beforeAll(() => {
    process.env.ARGON2_PEPPER = 'test-pepper-secret';
  });

  afterAll(() => {
    process.env.ARGON2_PEPPER = originalEnv;
  });

  beforeEach(() => {
    service = new HashingService();
  });

  describe('hash', () => {
    it('should return a hash different from the original password', async () => {
      const password = 'mySecurePassword123';
      const hash = await service.hash(password);

      expect(hash).not.toBe(password);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    it('should produce different hashes for the same password (due to random salt)', async () => {
      const password = 'mySecurePassword123';
      const hash1 = await service.hash(password);
      const hash2 = await service.hash(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce an argon2id hash', async () => {
      const hash = await service.hash('password');

      expect(hash).toContain('$argon2id$');
    });
  });

  describe('verify', () => {
    it('should return true for a correct password', async () => {
      const password = 'mySecurePassword123';
      const hash = await service.hash(password);

      const result = await service.verify(password, hash);

      expect(result).toBe(true);
    });

    it('should return false for an incorrect password', async () => {
      const hash = await service.hash('correctPassword');

      const result = await service.verify('wrongPassword', hash);

      expect(result).toBe(false);
    });
  });
});
