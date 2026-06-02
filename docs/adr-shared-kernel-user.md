# ADR: Shared Kernel — `User` table

**Status:** Accepted  
**Date:** 2026-06-02  
**Related:** [domain-analysis-user-auth.md](./domain-analysis-user-auth.md) (Issues #2, #3), [ARCHITECTURE-GUIDELINES.md](./ARCHITECTURE-GUIDELINES.md) §3

## Context

User Directory (`src/user/`) and Authentication (`src/auth/authentication/`) both need the same PostgreSQL `User` row. Two Prisma adapters exist: `UserRepository` (directory projection, no `passwordHash` on reads) and `AuthRepository` (credentials for sign-in).

## Decision

- **User Directory owns** the `User` model: migrations, create/update/delete, and `IUserDirectory`.
- **Authentication reads credentials** via `IUserCredentialsReader`, defined in `src/user/domain/ports/` and implemented by `AuthRepository` in auth. This is intentional Shared Kernel placement for extraction readiness (User Directory can stay authoritative while auth consumes a narrow port).
- Do **not** merge repositories or return `passwordHash` from directory APIs.

## Consequences

- Low data cohesion between modules (two paths to one table) is **accepted** and documented.
- Future extraction: User Directory service owns data; Authentication calls credentials API or replicated read model — port location may move with an ADR if product requires it.

## References

- `src/user/domain/ports/user-credentials-reader.port.ts`
- `src/user/application/user.repository.ts`, `src/auth/authentication/auth.repository.ts`
