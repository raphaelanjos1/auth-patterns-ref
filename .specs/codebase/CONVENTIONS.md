# Code Conventions

**Observed in:** active stack (`user`, `auth`, `audit-log`, `permissions-api`, `shared`)  
**Target for new/refactored code:** [clean-arch-lite](../../.cursor/skills/clean-arch-lite/SKILL.md)

## Architectural Rules (clean-arch-lite)

| Rule | Application in this repo |
|------|--------------------------|
| Ports at infra boundaries | `user/domain/ports/` (`USER_DIRECTORY`, `USER_CREDENTIALS_READER`) |
| Application layer | `user/application/` leaf; `auth/authentication/` + flat `auth.module` |
| No use-case class per method | Methods on `UserService`, `AuthService` |
| No mapper per field | Prisma projections + `omit` on directory reads |
| ≤4 files per new field | Meta when evolving schema |
| Rich `domain/` entity tree | Optional for new modules — **not** used in active IAM |

## Naming Conventions

**Files:**

- `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`
- Specs co-located: `*.spec.ts`
- DTOs: `src/user/dto/*.dto.ts`, `src/auth/authentication/sign-in.dto.ts`
- Ports: `src/user/domain/ports/*.port.ts`

**Classes:**

- PascalCase + role suffix: `UserService`, `AuthRepository`, `PermissionsGuard`

**Enums:**

- `UserRole`, `AuditAction` from `@generated/prisma` (SSOT)
- No duplicate `export enum UserRole` in DTOs

**Ports:**

- `export const X = Symbol('X')` + `interface IX` in same `*.port.ts`

## Code Organization

**Imports:** Relative between modules; Prisma via `@generated/prisma`.

**NestJS modules:**

- `providers`: port bindings + services
- `exports`: what other modules need (`AbilityFactory`, `AbilityPermissionChecker` from auth)
- Global guards in `AppModule`

**DTO validation:**

- `class-validator` + global `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`)

## Error Handling

- HTTP: Nest exceptions (`NotFoundException`, `ConflictException`, `UnauthorizedException`)
- Generic message on invalid credentials (no email enumeration)

## Cross-Module Rules (Story 6 / T12)

- IAM → Audit: only `audit-log/events/*` (`publishAudit`)
- IAM → Shared: `shared/database`, `shared/hashing`, `shared/contracts`, `shared/swagger`
- Forbidden: IAM → `audit-log.service` / `audit-log.module`
- user → auth: `permissions-api` or `user/domain/ports` only
- Verification: `yarn run check:boundaries`

## Comments / Docs

- Operational guides: `docs/` (JWT, security, audit, [coding-patterns.md](../../docs/coding-patterns.md))
- DDD analyses: `docs/*-user-auth.md`
- Executable spec: `.specs/features/modular-monolith-iam/`

## Testing Conventions

- Jest + `@nestjs/testing` for services/controllers/guards
- Mock Prisma via `moduleNameMapper` → `src/__mocks__/prisma.service.ts`
- E2E: `test/auth-user.e2e-spec.ts` with mocked DB
- Rich domain unit tests without Nest: only when `domain/*.entity.ts` exists
