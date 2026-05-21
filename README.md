# Auth Patterns Ref

Reference API for authentication and authorization with NestJS. The goal of this project is to serve as a reusable base for future projects, documenting security patterns and best practices.

## Architecture

Project built with [NestJS](https://nestjs.com/) following a modular monolith by business capability:

```
src/
├── user/
│   └── application/      # User Directory (CRUD, ports)
├── auth/
│   ├── authentication/   # JWT, sign-in, AuthGuard
│   └── authorization/    # RBAC, PermissionsGuard
├── audit-log/            # Audit (events + v1 contract)
├── permissions-api/      # RBAC facade for consumers (e.g. user)
└── shared/
    ├── database/         # Prisma
    ├── hashing/          # Argon2
    └── contracts/        # JwtPayload and shared contracts
```

> **`src/identity/`:** deprecated parallel stack — not used. Active stack = `user` + `auth` + `audit-log`. See [identity stack decision](docs/identity-stack-decision.md).

**Stack:**
- **Framework:** NestJS 11 + Express
- **Database:** PostgreSQL 17 + Prisma ORM
- **Authentication:** JWT (Bearer token)
- **Hashing:** Argon2id with salt + pepper
- **Security:** Helmet, CORS, Rate Limiting, Input Validation

## How to run the project

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) and Docker Compose
- npm

### 1. Clone and install dependencies

```bash
git clone <repository-url>
cd auth-patterns-ref
npm install
```

### 2. Configure environment variables

Create a `.env` file at the project root based on `.env.example`:

```bash
cp .env.example .env
```

Fill in the variables with the desired values:

| Variable        | Description                               | Example                                                           |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`  | PostgreSQL connection string              | `postgresql://postgres:postgres@localhost:5432/auth-patterns-ref` |
| `JWT_SECRET`    | Secret key for JWT signing                | (generate a long random string)                                   |
| `ARGON2_PEPPER` | Pepper for password hashing               | (generate a long random string)                                   |
| `PORT`          | Application port (optional)               | `3000`                                                            |

### 3. Start the database

```bash
docker compose up -d
```

This creates a PostgreSQL 17 container accessible on port `5432`.

### 4. Run Prisma migrations

```bash
npx prisma migrate dev
```

This applies the migrations and generates the Prisma Client.

### 5. Start the application

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`.

## Available scripts

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `npm run start:dev`  | Start in development mode       |
| `npm run start:prod` | Start in production mode        |
| `npm run build`      | Compile the project             |
| `npm run test`       | Run unit tests                  |
| `npm run test:e2e`   | E2E: smoke (`test/app.e2e-spec.ts`) + auth/user (`test/auth-user.e2e-spec.ts`, mocks) |
| `npm run check:boundaries` | Validate cross-domain imports (fitness function) |
| `npm run lint`       | Run the linter                  |

## API Docs (Swagger)

With the application running, access the interactive documentation at `http://localhost:3000/docs`.

A `swagger.json` file is also generated automatically at the project root when the application starts.

## Documentation

Detailed documentation is available in the `docs/` folder:

- [JWT Authentication](docs/jwt-authentication.md)
- [Security Measures](docs/security.md)
- [Prisma Migrations](docs/prisma-migrations.md)
- [Authorization](docs/authorization.md)
- [Audit Log](docs/audit-log.md)
