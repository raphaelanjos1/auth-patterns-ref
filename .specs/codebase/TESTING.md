# Testing Infrastructure

## Test Frameworks

**Unit/Integration:** Jest 30 + ts-jest  
**E2E:** Jest + Supertest (`test/jest-e2e.json`)  
**Coverage:** `yarn test:cov` → `coverage/`

## Test Organization

**Location:** Co-located `src/**/*.spec.ts`; E2E in `test/*.e2e-spec.ts`  
**Naming:** `<unit>.spec.ts`, `app.e2e-spec.ts`, `auth-user.e2e-spec.ts`  
**Structure:** `describe` per class; Prisma mocked globally

## Testing Patterns

### Unit tests (services, guards)

**Approach:** `@nestjs/testing` with `{ provide: SYMBOL, useValue: mock }`  
**Examples:** `user.service.spec.ts`, `auth.service.spec.ts`, `auth.guard.spec.ts`, `permissions.guard.spec.ts`, `ability-permission-checker.spec.ts`

### E2E

**Approach:** `Test.createTestingModule({ imports: [AppModule] })` + supertest + global `ValidationPipe`  
**Coverage:** `test/app.e2e-spec.ts` (smoke); `test/auth-user.e2e-spec.ts` (sign-in 401/201, `GET /user/:id` 401/200 with ADMIN token, mocks)

## Test Execution

| Command | Purpose |
|---------|---------|
| `yarn test` | Unit (`src`) |
| `yarn test:watch` | Watch |
| `yarn test:cov` | Coverage |
| `yarn test:e2e` | E2E |
| `yarn lint` | ESLint |
| `yarn build` | Compile |
| `yarn run check:boundaries` | Import fitness |

## Coverage Targets

**Current:** Not enforced in CI  
**Goals:** Green tests per story; do not drop coverage silently

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
|------------|-------------------|------------------|-------------|
| Application service | unit | `src/**/*.service.spec.ts` | `yarn test` |
| HTTP controller | unit | `src/**/*.controller.spec.ts` | `yarn test` |
| Guards / authorization | unit | `src/auth/**/*.spec.ts` | `yarn test` |
| Audit contract | unit | `audit-log/contracts/*.spec.ts`, `audit-log.service.spec.ts` | `yarn test` |
| Repository (Prisma) | unit (mocked) | via service specs | `yarn test` |
| HTTP flows | e2e | `test/*.e2e-spec.ts` | `yarn test:e2e` |

**Optional gap:** E2E with real PostgreSQL (Testcontainers).

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model |
|-----------|----------------|-----------------|
| Unit (mocked Prisma) | Yes | `__mocks__/prisma.service.ts` |
| E2E (current) | Yes | In-memory app; mocked Prisma in auth-user |
| E2E (future + DB) | No | Would need dedicated DB |

## Gate Check Commands

| Gate | When | Command |
|------|------|---------|
| Quick | Refactor / ports / audit helper | `yarn test` |
| Full | HTTP / guards | `yarn test` && `yarn test:e2e` |
| Build | Before merge | `yarn build` && `yarn lint` && `yarn test` && `yarn test:e2e` && `yarn run check:boundaries` |
