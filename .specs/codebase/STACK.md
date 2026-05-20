# Tech Stack

**Analyzed:** 2026-05-20

## Core

- **Framework:** NestJS 11 (`@nestjs/common`, `@nestjs/core` ^11.0.1)
- **Language:** TypeScript 5.7
- **Runtime:** Node.js 18+ (documentado no README)
- **Package manager:** npm (scripts em `package.json`; `yarn.lock` presente)

## Backend

- **API style:** REST HTTP (Express via `@nestjs/platform-express`)
- **Database:** PostgreSQL 17 + Prisma ORM 7.5 (`@prisma/client`, `@prisma/adapter-pg`)
- **Client output:** `generated/prisma` (generator `prisma-client`)
- **Authentication:** JWT (`@nestjs/jwt`), global `AuthGuard`
- **Authorization:** Custom RBAC — `AbilityFactory`, `PermissionsGuard`, policy map
- **Password hashing:** Argon2 (`argon2` + `HashingService` com pepper em env)
- **Events:** `@nestjs/event-emitter` (audit in-process)
- **API docs:** `@nestjs/swagger` + `swagger.json` na raiz ao subir
- **Security middleware:** `helmet`, CORS, `@nestjs/throttler` (global guard)

## Testing

- **Unit/Integration:** Jest 30 + `ts-jest`, specs co-located `*.spec.ts` em `src/`
- **E2E:** Jest + Supertest (`test/jest-e2e.json`, `test/app.e2e-spec.ts`)
- **Mocks:** `src/__mocks__/prisma.service.ts` via `moduleNameMapper`

## External Services

- **Database:** PostgreSQL (Docker Compose local)
- **Nenhum SaaS** (email, IdP externo, etc.) no escopo atual

## Development Tools

- **Lint:** ESLint 9 + `typescript-eslint` + Prettier
- **Build:** `@nestjs/cli` (`nest build`)
- **ORM CLI:** Prisma migrate (`npx prisma migrate dev`)

## Environment Variables

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Prisma / PostgreSQL |
| `JWT_SECRET` | Assinatura JWT |
| `ARGON2_PEPPER` | Pepper no hashing |
| `PORT` | Porta HTTP (default 3000) |
