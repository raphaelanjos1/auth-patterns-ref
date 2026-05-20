import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HashingService } from '../src/shared/hashing/hashing.service';
import {
  USER_CREDENTIALS_READER,
  type IUserCredentialsReader,
} from '../src/user/domain/ports/user-credentials-reader.port';
import {
  USER_DIRECTORY,
  type IUserDirectory,
} from '../src/user/domain/ports/user-directory.port';
import { createE2eApp } from './helpers/create-e2e-app';

describe('Auth & User (e2e)', () => {
  let app: INestApplication;
  let credentialsReader: jest.Mocked<IUserCredentialsReader>;
  let hashingService: jest.Mocked<Pick<HashingService, 'verify' | 'hash'>>;
  let userDirectory: jest.Mocked<IUserDirectory>;

  const mockAdmin = {
    id: 'admin-1',
    fullName: 'Admin User',
    email: 'admin@example.com',
    passwordHash: 'hashed-password',
    role: 'ADMIN' as const,
  };

  const mockUserPublic = {
    id: mockAdmin.id,
    fullName: mockAdmin.fullName,
    email: mockAdmin.email,
    role: mockAdmin.role,
  };

  beforeEach(async () => {
    const credentialsReaderMock = { findByEmailWithPassword: jest.fn() };
    const hashingServiceMock = { verify: jest.fn(), hash: jest.fn() };
    const userDirectoryMock = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    app = await createE2eApp((builder) =>
      builder
        .overrideProvider(USER_CREDENTIALS_READER)
        .useValue(credentialsReaderMock)
        .overrideProvider(HashingService)
        .useValue(hashingServiceMock)
        .overrideProvider(USER_DIRECTORY)
        .useValue(userDirectoryMock),
    );

    credentialsReader = app.get(USER_CREDENTIALS_READER);
    hashingService = app.get(HashingService);
    userDirectory = app.get(USER_DIRECTORY);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/sign-in', () => {
    it('returns 401 for invalid credentials', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: 'admin@example.com', password: 'wrong-password' })
        .expect(401);

      expect(hashingService.verify).not.toHaveBeenCalled();
    });

    it('returns accessToken for valid credentials', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockAdmin);
      hashingService.verify.mockResolvedValue(true);

      const response = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: mockAdmin.email, password: 'password123' })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          accessToken: expect.any(String),
        }),
      );
      expect(hashingService.verify).toHaveBeenCalledWith(
        'password123',
        mockAdmin.passwordHash,
      );
    });
  });

  describe('GET /user/:id', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer())
        .get(`/user/${mockAdmin.id}`)
        .expect(401);
    });

    it('returns 200 with user for ADMIN Bearer token', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(mockAdmin);
      hashingService.verify.mockResolvedValue(true);
      userDirectory.findById.mockResolvedValue(mockUserPublic);

      const signIn = await request(app.getHttpServer())
        .post('/auth/sign-in')
        .send({ email: mockAdmin.email, password: 'password123' })
        .expect(201);

      const { accessToken } = signIn.body as { accessToken: string };

      const response = await request(app.getHttpServer())
        .get(`/user/${mockAdmin.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockUserPublic);
      expect(userDirectory.findById).toHaveBeenCalledWith(mockAdmin.id);
    });
  });
});
