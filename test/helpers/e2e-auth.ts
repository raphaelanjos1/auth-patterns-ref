import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function signInAndGetToken(
  app: INestApplication,
  credentials: { email: string; password: string },
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/sign-in')
    .send(credentials)
    .expect(201);

  return (response.body as { accessToken: string }).accessToken;
}
