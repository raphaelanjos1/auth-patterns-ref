# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** Jest 30 + ts-jest  
**E2E:** Jest + Supertest (`test/jest-e2e.json`)  
**Coverage:** `npm run test:cov` → `coverage/`

## Test Organization

**Location:** Co-located `src/**/*.spec.ts`; E2E em `test/*.e2e-spec.ts`  
**Naming:** `<unit>.spec.ts`, `app.e2e-spec.ts`  
**Structure:** `describe` por classe; mocks de `PrismaService` via mapper global

## Testing Patterns

### Unit tests (services, guards, domain)

**Approach:** `@nestjs/testing` com providers mockados; domain tests sem módulo Nest  
**Examples:** `user.service.spec.ts`, `auth.guard.spec.ts`, `identity/domain/user.entity.spec.ts`

### E2E

**Approach:** `Test.createTestingModule({ imports: [AppModule] })` + supertest + `ValidationPipe` global  
**Coverage today:** `GET /` smoke; `POST /auth/sign-in`; `GET/POST/PATCH/DELETE /user` (mocks em `test/auth-user.e2e-spec.ts`; `afterEach` com `app.close()` em ambos os e2e)

## Test Execution

| Command | Purpose |
|---------|---------|
| `npm test` | Unit (rootDir `src`) |
| `npm run test:watch` | Watch mode |
| `npm run test:cov` | Coverage |
| `npm run test:e2e` | E2E |
| `npm run lint` | ESLint |
| `npm run build` | Compile |

## Coverage Targets

**Current:** Não documentado/enforced  
**Goals:** Manter testes verdes em cada story; não reduzir contagem de testes silenciosamente

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
|------------|-------------------|------------------|-------------|
| Domain entity (`identity/domain`) | unit | `src/identity/domain/**/*.spec.ts` | `npm test` |
| Application service | unit | `src/**/*.service.spec.ts` | `npm test` |
| HTTP controller | unit | `src/**/*.controller.spec.ts` | `npm test` |
| Guards / authorization | unit | `src/**/authorization/*.spec.ts`, `auth.guard.spec.ts` | `npm test` |
| Repository (Prisma) | unit (mocked) | via service specs + prisma mock | `npm test` |
| Module wiring / HTTP flows | e2e | `test/*.e2e-spec.ts` | `npm run test:e2e` |
| Audit listener | unit | `audit-log.service.spec.ts` | `npm test` |

**Gap (opcional):** DB real em e2e (Testcontainers).

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
|-----------|----------------|-----------------|----------|
| Unit (mocked Prisma) | Yes | `__mocks__/prisma.service.ts`, no shared DB | `package.json` moduleNameMapper |
| E2E (current) | Yes* | In-memory app per test file; no DB assertions yet | `app.e2e-spec.ts` only hits `/` |
| E2E (future with DB) | No | Would need Testcontainers or dedicated DB | Not implemented |

\*Reavaliar quando E2E usar PostgreSQL real.

## Gate Check Commands

| Gate Level | When to Use | Command |
|------------|-------------|---------|
| Quick | After refactor story (move files, SSOT, helper) | `npm test` |
| Full | After HTTP/guard behavior change | `npm test` && `npm run test:e2e` |
| Build | Before merge / milestone | `npm run build` && `npm run lint` && `npm test` && `npm run test:e2e` |
