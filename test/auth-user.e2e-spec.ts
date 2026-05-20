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
import { signInAndGetToken } from './helpers/e2e-auth';

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

  const mockRegularUser = {
    id: 'user-1',
    fullName: 'Regular User',
    email: 'user@example.com',
    passwordHash: 'hashed-password',
    role: 'USER' as const,
  };

  const createUserPayload = {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    password: 'password123',
    role: 'USER' as const,
  };

  const createdUserPublic = {
    id: 'user-2',
    fullName: createUserPayload.fullName,
    email: createUserPayload.email,
    role: createUserPayload.role,
  };

  const targetUser = createdUserPublic;

  const updateUserPayload = { fullName: 'Jane Updated' };

  const updatedUserPublic = {
    ...targetUser,
    fullName: updateUserPayload.fullName,
  };

  async function getAdminToken(): Promise<string> {
    credentialsReader.findByEmailWithPassword.mockResolvedValue(mockAdmin);
    hashingService.verify.mockResolvedValue(true);
    return signInAndGetToken(app, {
      email: mockAdmin.email,
      password: 'password123',
    });
  }

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
      userDirectory.findById.mockResolvedValue(mockUserPublic);
      const accessToken = await getAdminToken();

      const response = await request(app.getHttpServer())
        .get(`/user/${mockAdmin.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(mockUserPublic);
      expect(userDirectory.findById).toHaveBeenCalledWith(mockAdmin.id);
    });
  });

  describe('POST /user', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer())
        .post('/user')
        .send(createUserPayload)
        .expect(401);
    });

    it('returns 403 for USER role without create permission', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(
        mockRegularUser,
      );
      hashingService.verify.mockResolvedValue(true);
      const accessToken = await signInAndGetToken(app, {
        email: mockRegularUser.email,
        password: 'password123',
      });

      await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createUserPayload)
        .expect(403);

      expect(userDirectory.create).not.toHaveBeenCalled();
    });

    it('returns 201 and created user for ADMIN Bearer token', async () => {
      userDirectory.findByEmail.mockResolvedValue(null);
      hashingService.hash.mockResolvedValue('hashed-new-password');
      userDirectory.create.mockResolvedValue(createdUserPublic);
      const accessToken = await getAdminToken();

      const response = await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createUserPayload)
        .expect(201);

      expect(response.body).toEqual(createdUserPublic);
      expect(userDirectory.findByEmail).toHaveBeenCalledWith(
        createUserPayload.email,
      );
      expect(hashingService.hash).toHaveBeenCalledWith(createUserPayload.password);
      expect(userDirectory.create).toHaveBeenCalledWith({
        fullName: createUserPayload.fullName,
        email: createUserPayload.email,
        passwordHash: 'hashed-new-password',
        role: createUserPayload.role,
      });
    });

    it('returns 409 when email is already in use', async () => {
      userDirectory.findByEmail.mockResolvedValue({
        id: 'existing-1',
        fullName: 'Existing',
        email: createUserPayload.email,
        role: 'USER' as const,
      });
      const accessToken = await getAdminToken();

      await request(app.getHttpServer())
        .post('/user')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createUserPayload)
        .expect(409);

      expect(hashingService.hash).not.toHaveBeenCalled();
      expect(userDirectory.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /user/:id', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer())
        .patch(`/user/${targetUser.id}`)
        .send(updateUserPayload)
        .expect(401);
    });

    it('returns 403 for USER role without update permission', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(
        mockRegularUser,
      );
      hashingService.verify.mockResolvedValue(true);
      const accessToken = await signInAndGetToken(app, {
        email: mockRegularUser.email,
        password: 'password123',
      });

      await request(app.getHttpServer())
        .patch(`/user/${targetUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateUserPayload)
        .expect(403);

      expect(userDirectory.update).not.toHaveBeenCalled();
    });

    it('returns 200 and updated user for ADMIN Bearer token', async () => {
      userDirectory.findById.mockResolvedValue(targetUser);
      userDirectory.update.mockResolvedValue(updatedUserPublic);
      const accessToken = await getAdminToken();

      const response = await request(app.getHttpServer())
        .patch(`/user/${targetUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateUserPayload)
        .expect(200);

      expect(response.body).toEqual(updatedUserPublic);
      expect(userDirectory.findById).toHaveBeenCalledWith(targetUser.id);
      expect(userDirectory.update).toHaveBeenCalledWith(
        targetUser.id,
        updateUserPayload,
      );
    });

    it('returns 404 when user does not exist', async () => {
      userDirectory.findById.mockResolvedValue(null);
      const accessToken = await getAdminToken();

      await request(app.getHttpServer())
        .patch('/user/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateUserPayload)
        .expect(404);

      expect(userDirectory.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /user/:id', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer())
        .delete(`/user/${targetUser.id}`)
        .expect(401);
    });

    it('returns 403 for USER role without delete permission', async () => {
      credentialsReader.findByEmailWithPassword.mockResolvedValue(
        mockRegularUser,
      );
      hashingService.verify.mockResolvedValue(true);
      const accessToken = await signInAndGetToken(app, {
        email: mockRegularUser.email,
        password: 'password123',
      });

      await request(app.getHttpServer())
        .delete(`/user/${targetUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403);

      expect(userDirectory.delete).not.toHaveBeenCalled();
    });

    it('returns 200 and deleted user for ADMIN Bearer token', async () => {
      userDirectory.findById.mockResolvedValue(targetUser);
      userDirectory.delete.mockResolvedValue(targetUser);
      const accessToken = await getAdminToken();

      const response = await request(app.getHttpServer())
        .delete(`/user/${targetUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(targetUser);
      expect(userDirectory.findById).toHaveBeenCalledWith(targetUser.id);
      expect(userDirectory.delete).toHaveBeenCalledWith(targetUser.id);
    });

    it('returns 404 when user does not exist', async () => {
      userDirectory.findById.mockResolvedValue(null);
      const accessToken = await getAdminToken();

      await request(app.getHttpServer())
        .delete('/user/nonexistent')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(userDirectory.delete).not.toHaveBeenCalled();
    });
  });
});
