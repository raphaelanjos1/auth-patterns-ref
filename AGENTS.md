# Auth Patterns Reference — Agent Guide

## Documentation — Progressive Loading
**CRITICAL**: Only load documents relevant to your current task. Do NOT load all documentation at once.

Before implementing any feature:
1. Read `docs/coding-patterns.md` first.
2. Follow the file references inside it to load the specific examples you need.
3. For brownfield context: `.specs/codebase/ARCHITECTURE.md`, `.specs/features/modular-monolith-iam/spec.md`.

Do not implement without this step.

## Communication
- Always use Caveman mode (terse, no filler, full technical accuracy).

## Tooling — Context7 MCP
Always use Context7 automatically for library/API docs, code generation, and setup steps — no need to ask.

1. `mcp__context7__resolve-library-id` → get the library ID
2. `mcp__context7__get-library-docs` → fetch the docs

Trigger on: "how do I use X", "generate X with library Y", "configure Z", any new dependency usage.

## Build & Test
- Package manager: `yarn` (never `npm`)
- Build: `yarn build`
- Test all: `yarn test`
- Test single: `yarn test -- --testNamePattern "test name"`
- Lint: `yarn lint`
- Watch: `yarn test:watch`
- E2E: `yarn test:e2e`
- Domain boundaries: `yarn run check:boundaries`

## Database (Prisma — no nx in this project)
- Generate migration: `yarn prisma migrate dev --name <name>`
- Run migrations: `yarn prisma migrate deploy`
- Generate client: `yarn prisma generate`
- Never create migration SQL manually.

## Code Style
- TypeScript strict mode throughout.
- No `try/catch` unless catching a specific recoverable error.
- No comments unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant).
- No `any` type.

## Architecture
- **Active stack (wired in `AppModule`):** `src/user/` + `src/auth/` + `src/audit-log/` + `src/permissions-api/` + `src/shared/`. There is **no** `src/identity/` — see [docs/identity-stack-decision.md](docs/identity-stack-decision.md).
- Use skills `clean-arch-lite` + `tactical-ddd` for new modules and refactors.
- Always read `docs/coding-patterns.md` before implementing — canonical examples are grounded in the active stack above.
- IAM layout: `user/application/` for User Directory; `auth/authentication/` and `auth/authorization/` for Access Control; `user/domain/ports/` for persistence ports only (not a full `domain/` tree everywhere).
- Cross-domain imports: IAM → audit only via `audit-log/events/`; user → auth only via `permissions-api` or `user/domain/ports`. Enforced by `yarn run check:boundaries`.

## Testing
- Service/guard tests: NestJS container with `{ provide: SYMBOL, useValue: mock }`.
- Prefer real implementations over mocks when a real DB is available.
- Do not mock the database in service-level tests when a real DB is available.
- E2E: `test/auth-user.e2e-spec.ts` (mocked Prisma).

## Implementation Plans
- Write high quality, maintainable code — avoid overengineering.
- Follow `docs/coding-patterns.md` before defaulting to generic industry standards.
- Do not add abstractions, layers, or error handling beyond what the task requires.
- Three similar lines is better than a premature abstraction.
