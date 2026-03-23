import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { HashingService } from '../shared/hashing/hashing.service';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: jest.Mocked<AuthRepository>;
  let hashingService: jest.Mocked<HashingService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    fullName: 'John Doe',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN' as const,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AuthRepository,
          useValue: { findByEmailWithPassword: jest.fn() },
        },
        {
          provide: HashingService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    authRepository = module.get<jest.Mocked<AuthRepository>>(AuthRepository);
    hashingService = module.get<jest.Mocked<HashingService>>(HashingService);
    jwtService = module.get<jest.Mocked<JwtService>>(JwtService);
  });

  describe('signIn', () => {
    const dto = { email: 'john@example.com', password: 'password123' };

    it('should return an access token when credentials are valid', async () => {
      authRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      const result = await service.signIn(dto);

      expect(result).toEqual({ accessToken: 'jwt-token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      authRepository.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(hashingService.verify).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      authRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(false);

      await expect(service.signIn(dto)).rejects.toThrow(UnauthorizedException);
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should verify password against the stored hash', async () => {
      authRepository.findByEmailWithPassword.mockResolvedValue(mockUser);
      hashingService.verify.mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('jwt-token');

      await service.signIn(dto);

      expect(hashingService.verify).toHaveBeenCalledWith(
        dto.password,
        mockUser.passwordHash,
      );
    });
  });
});
