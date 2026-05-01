# Auth Patterns Reference — Agent Guide

## Communication
- Always use Caveman mode (terse, no filler, full technical accuracy).

## Tooling — Context7 MCP
Always use Context7 automatically for library/API docs, code generation, and setup steps — no need to ask.

1. `mcp__context7__resolve-library-id` → get the library ID
2. `mcp__context7__get-library-docs` → fetch the docs

Trigger on: "how do I use X", "generate X with library Y", "configure Z", any new dependency usage.

## Documentation — Progressive Loading
Before implementing any feature:
1. Read `docs/coding-patterns.md` first.
2. Follow the file references inside it to load the specific examples you need.

Do not implement without this step.

## Build & Test
- Package manager: `yarn` (never `npm`)
- Build: `yarn build`
- Test all: `yarn test`
- Test single: `yarn test -- --testNamePattern "test name"`
- Lint: `yarn lint`
- Watch: `yarn test:watch`
- E2E: `yarn test:e2e`

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
- Use skills `clean-arch-lite` + `tactical-ddd` for all new modules and refactors.
- Always read `docs/coding-patterns.md` before implementing — it has canonical examples grounded in `src/identity/`.
- No sub-folders inside a bounded context at the application layer (flat root: only `domain/`, `infrastructure/`, `dto/`, `authorization/` get sub-folders).

## Testing
- Domain tests: hand-roll fakes for ports, no `Test.createTestingModule`.
- Service tests: NestJS container with `{ provide: SYMBOL, useValue: mock }`.
- Prefer real implementations over mocks.
- Do not mock the database in service-level tests when a real DB is available.

## Implementation Plans
- Write high quality, maintainable code — avoid overengineering.
- Follow `docs/coding-patterns.md` before defaulting to generic industry standards.
- Do not add abstractions, layers, or error handling beyond what the task requires.
- Three similar lines is better than a premature abstraction.
