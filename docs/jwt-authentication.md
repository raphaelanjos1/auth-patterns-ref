# JWT Authentication

## Overview

Authentication uses JSON Web Tokens (JWT) to protect API endpoints.
The user authenticates once via email/password and receives a token that must be
sent in all subsequent requests.

## Complete flow

```
                                    API
User                            (NestJS)
  |                                |
  |  POST /auth/sign-in            |
  |  { email, password }           |
  |------------------------------->|
  |                                |--- Finds user by email (with passwordHash)
  |                                |--- Verifies password with Argon2
  |                                |--- Generates JWT with { sub, email, role }
  |                                |
  |  200 { accessToken: "eyJ..." } |
  |<-------------------------------|
  |                                |
  |  GET /user (or any protected   |
  |  route)                        |
  |  Authorization: Bearer eyJ...  |
  |------------------------------->|
  |                                |--- AuthGuard extracts token from header
  |                                |--- Verifies signature and expiration
  |                                |--- Injects payload into request.user
  |                                |
  |  200 { ...data... }            |
  |<-------------------------------|
```

## Components

### 1. Sign-in (`POST /auth/sign-in`)

**Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation (ValidationPipe + class-validator):**

| Field      | Rules                          |
|------------|--------------------------------|
| `email`    | Required, valid email format   |
| `password` | Required, string               |

If validation fails, returns `400 Bad Request` with error messages before reaching the service.

**Response scenarios:**

| Scenario             | Status | Response                                     |
|----------------------|--------|----------------------------------------------|
| Valid credentials    | 200    | `{ "accessToken": "eyJhbG..." }`             |
| Email not found      | 401    | `{ "message": "Invalid credentials" }`       |
| Wrong password       | 401    | `{ "message": "Invalid credentials" }`       |
| Invalid body         | 400    | `{ "message": ["email must be an email"] }`  |

> The error message is identical for non-existent email and wrong password.
> This is intentional — it prevents an attacker from discovering which emails are
> registered (user enumeration).

### 2. AuthGuard

Global guard applied to controllers that require authentication.
Currently protects all routes in the `user` module.

**What the guard does:**

1. Extracts the token from the `Authorization: Bearer <token>` header
2. Verifies the signature and expiration via `JwtService.verifyAsync()`
3. If valid, places the decoded payload in `request['user']`
4. If invalid or missing, returns `401 Unauthorized`

**How to apply to a controller:**

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/authentication/auth.guard';

@UseGuards(AuthGuard)
@Controller('example')
export class ExampleController {
  // all routes in this controller require a token
}
```

> In this project, `AuthGuard` is registered **globally** in `AppModule`. Use `@Public()` on routes that must skip JWT (e.g. `POST /auth/sign-in`). Per-controller `@UseGuards(AuthGuard)` is optional when not using the global guard.

To protect only a specific route:

```typescript
@UseGuards(AuthGuard)
@Get('protected-route')
protectedRoute() {
  // ...
}
```

### 3. Token payload

The generated JWT contains:

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1742331560,
  "exp": 1742331860
}
```

| Field   | Description                                    |
|---------|------------------------------------------------|
| `sub`   | User ID (subject — JWT convention)             |
| `email` | User email                                     |
| `role`  | User role (`UserRole` from Prisma: ADMIN, USER, MANAGER) |
| `iat`   | Issuance timestamp (issued at)                 |
| `exp`   | Expiration timestamp (iat + lifetime)          |

## Configuration

**Required environment variables (`.env`):**

| Variable     | Description                        |
|--------------|------------------------------------|
| `JWT_SECRET` | Secret key for signing tokens      |

**Expiration time:**

Configured in `auth.module.ts` when registering the `JwtModule`:

```typescript
JwtModule.register({
  global: true,
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '5m' }, // change here
})
```

The `global: true` makes the `JwtService` available in all modules without
needing to import `JwtModule` again.

## File structure

```
src/auth/
  auth.module.ts                        — JwtModule (global), credentials port, AbilityFactory
  authentication/
    auth.controller.ts                  — POST /auth/sign-in
    auth.service.ts                     — Credentials verify + JWT + publishAudit
    auth.repository.ts                  — IUserCredentialsReader adapter (password projection)
    auth.guard.ts                       — Bearer JWT validation → request.user
    auth.guard.spec.ts
    public.decorator.ts                 — @Public() — bypass global AuthGuard
    sign-in.dto.ts                      — Sign-in body validation

src/shared/contracts/
  jwt-payload.ts                        — JwtPayload SSOT (sub, email, role)

src/user/domain/ports/
  user-credentials-reader.port.ts       — Port implemented by AuthRepository
```

## Testing

**1. Create a user:**

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John","email":"john@ex.com","password":"123456","role":"USER"}'
```

> Note: the user creation route is protected by AuthGuard.
> To create the first user, temporarily remove the `@UseGuards`
> from the controller or create via seed/prisma studio.

**2. Login:**

```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"john@ex.com","password":"123456"}'
```

**3. Access a protected route:**

```bash
curl http://localhost:3000/user \
  -H "Authorization: Bearer <received-token>"
```
