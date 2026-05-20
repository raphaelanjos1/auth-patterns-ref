# Code Conventions

**Observed in:** stack ativa (`user`, `auth`, `audit-log`, `shared`)  
**Target for new/refactored code:** [clean-arch-lite](../../.cursor/skills/clean-arch-lite/SKILL.md)

## Architectural Rules (clean-arch-lite)

| Regra | Aplicação neste repo |
|-------|----------------------|
| Domínio sem deps de framework/ORM | Obrigatório em `src/identity/domain/`; aspiracional na stack ativa |
| Porta (interface + Symbol) | Só ao cruzar DB, JWT, hashing, clock — Story 7 introduz ports de User |
| Application layer flat | Controllers + services + DTOs no root do módulo (ou `authentication/` leaf, não `application/` por feature) |
| Sem use-case class por método | Métodos em `UserService`, `AuthService` |
| Sem mapper por campo | `rehydrate` / `toPersistence` na entidade quando houver entidade de domínio |
| ≤4 arquivos por campo novo | Meta ao evoluir schema |

## Naming Conventions

**Files:**

- `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.repository.ts`
- Specs co-located: `*.spec.ts`
- DTOs: `src/<module>/dto/<action>.dto.ts` — ex.: `create-user.dto.ts`, `sign-in.dto.ts`

**Classes:**

- PascalCase + sufixo de papel: `UserService`, `AuthRepository`, `PermissionsGuard`

**Enums:**

- Preferir `UserRole`, `AuditAction` de `@generated/prisma` (SSOT — Story 2)
- Evitar `export enum UserRole` duplicado em DTOs

**Ports (quando existirem):**

- `*.port.ts` com `export const X_PORT = Symbol('X_PORT')` + interface `IX`

## Code Organization

**Imports:** Relativos entre módulos (`../shared/...`); Prisma via `@generated/prisma` quando adotado.

**NestJS modules:**

- `providers`: repositories + services
- `exports`: apenas o que outros módulos precisam (ex.: `AbilityFactory`)
- Guards globais em `AppModule`, não duplicar por módulo

**DTO validation:**

- `class-validator` + `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`)

## Error Handling

- HTTP: exceções Nest (`NotFoundException`, `ConflictException`, `UnauthorizedException`)
- Mensagens genéricas em credenciais inválidas (não vazar se email existe)

## Cross-Module Rules (governance — Story 6)

- IAM → Audit: apenas `audit-log/events/*` e helper de publish
- IAM → Shared: `shared/database`, `shared/hashing`, swagger
- Proibido: IAM importar `audit-log.service` diretamente

## Comments / Docs

- Docs narrativos em `docs/` (JWT, security, audit)
- Análises arquiteturais DDD em `docs/*-user-auth.md`
- Spec executável em `.specs/`

## Testing Conventions

- Jest + `@nestjs/testing` para services/controllers/guards
- Mock Prisma via `moduleNameMapper` em `package.json`
- Domain entity tests sem Nest (ex.: `identity/domain/user.entity.spec.ts`)
