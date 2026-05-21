# Security Measures

Documentation of the security measures applied to the API for protection against common vulnerabilities.

## 1. Helmet

**File:** `src/main.ts`

```typescript
app.use(helmet());
```

Helmet automatically configures various HTTP security headers in the API response:

- **X-Content-Type-Options: nosniff** — prevents the browser from trying to guess the content type (MIME sniffing), avoiding execution of malicious files.
- **Strict-Transport-Security (HSTS)** — forces HTTPS usage, protecting against man-in-the-middle attacks.
- **X-Frame-Options: SAMEORIGIN** — prevents the application from being loaded inside iframes from other domains, protecting against clickjacking.
- **Remove X-Powered-By** — hides server technology, making targeted attacks harder.

**Protects against:** clickjacking, MIME sniffing, man-in-the-middle attacks, server fingerprinting.

---

## 2. CORS (Cross-Origin Resource Sharing)

**File:** `src/main.ts`

```typescript
app.enableCors({ origin: ['http://localhost:3000'] });
```

Restricts which domains can make requests to the API. Only the origins listed in the `origin` array are authorized. Requests from any other domain will be blocked by the browser.

**Protects against:** unauthorized requests from unknown origins, API abuse by third-party sites.

---

## 3. Rate Limiting (Throttler)

**Files:** `src/app.module.ts`, `src/auth/authentication/auth.controller.ts`

### Global limits (all routes)

| Window | Limit            |
| ------ | ---------------- |
| 1s     | 3 requests       |
| 10s    | 20 requests      |
| 60s    | 100 requests     |

### `/auth/sign-in` route limits (more restrictive)

| Window | Limit            |
| ------ | ---------------- |
| 1s     | 1 request        |
| 1min   | 5 requests       |
| 10min  | 10 requests      |

Rate limiting controls the number of requests a same client can make within a given time interval. When the limit is exceeded, the API returns `429 Too Many Requests`.

The login route has more aggressive limits as it is the primary target of brute force attacks.

**Protects against:** brute force attacks, application-level DDoS, API resource abuse.

---

## 4. Input Validation (ValidationPipe)

**File:** `src/main.ts`

```typescript
app.useGlobalPipes(
  new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
);
```

- **whitelist: true** — automatically removes fields not declared in the DTO.
- **forbidNonWhitelisted: true** — rejects the request with `400 Bad Request` if there are fields not declared in the DTO.

Example: if the DTO accepts `email` and `password`, sending `{ "email": "...", "password": "...", "role": "admin" }` returns an error indicating that `role` should not exist.

**Protects against:** mass assignment, injection of malicious fields, manipulation of properties like `role` or `isAdmin`.

---

## 5. JWT Authentication with Global Guard

**Files:** `src/auth/authentication/auth.guard.ts`, `src/app.module.ts`

The `AuthGuard` is registered globally via `APP_GUARD`, ensuring that **all routes are protected by default**. Only routes explicitly marked with the `@Public()` decorator are accessible without authentication.

The JWT token is sent by the client in the `Authorization: Bearer <token>` header and validated on every request.

**Protects against:** unauthorized access to API endpoints, accidental exposure of routes without authentication.

---

## 6. Password Hashing with Argon2

**File:** `src/shared/hashing/hashing.service.ts`

User passwords are stored using the Argon2 algorithm, which is resistant to GPU attacks and considered state of the art in password hashing.

**Protects against:** cleartext password leaks in case of database compromise, rainbow table attacks and offline brute force.
