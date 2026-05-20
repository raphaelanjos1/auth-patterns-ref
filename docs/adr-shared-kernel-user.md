# ADR: Shared Kernel — Prisma `User` table

**Status:** Accepted  
**Date:** 2026-05-20  
**Requirement:** [IAM-09](../.specs/features/modular-monolith-iam/spec.md) (P2: Shared Kernel doc)  
**Related:** [Domain analysis](./domain-analysis-user-auth.md) · [Coupling analysis](./coupling-analysis-user-auth.md) · [Decomposition roadmap](./decomposition-planning-roadmap-user-auth.md)

---

## Context

The modular monolith has two IAM subdomains that both persist to the same Prisma `User` model:

| Subdomain | Module | Persistence adapter |
|-----------|--------|---------------------|
| User Directory | `src/user` | `UserRepository` |
| Authentication | `src/auth/authentication` | `AuthRepository` |

There is **no** TypeScript import between `user` and `auth` for persistence, but both adapters talk to the same database table. That is a **Shared Kernel** in DDD terms: a small, shared data contract that multiple bounded contexts depend on.

Without explicit ownership rules, teams might merge repositories, leak `passwordHash` on user APIs, or migrate schema from the wrong context when splitting services.

---

## Decision

### 1. User Directory owns the `User` model lifecycle

**Owner:** `src/user` (`UserService` + `UserRepository`)

User Directory is the **only** context that creates, updates, and deletes users. It hashes passwords on create and never returns `passwordHash` on reads.

`UserRepository` applies `omit: { passwordHash: true }` on every query and mutation return path:

```10:14:src/user/user.repository.ts
  async findById(id: string) {
    return this.prisma.client.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
```

The same omission applies to `findByEmail`, `findAll`, `create`, `update`, and `delete` (see full file).

**Implications:**

- Prisma migrations that change `User` shape (columns, indexes, constraints) are owned by User Directory’s evolution path.
- Authentication must not expose write APIs on `User`; sign-in only **reads** credentials.

### 2. Authentication uses a credentials projection only

**Consumer:** `src/auth/authentication` (`AuthService` + `AuthRepository`)

Authentication loads the **full row** only for sign-in verification: `email` + `passwordHash` (and claims fields used after verify: `id`, `role`).

```8:12:src/auth/authentication/auth.repository.ts
  async findByEmailWithPassword(email: string) {
    return this.prisma.client.user.findUnique({
      where: { email },
    });
  }
```

`AuthService.signIn` uses `AuthRepository` exclusively for that lookup; it does not call `UserRepository`.

```18:28:src/auth/authentication/auth.service.ts
  async signIn(dto: SignInDto) {
    const user = await this.authRepository.findByEmailWithPassword(dto.email);
    // ...
    const isPasswordValid = await this.hashingService.verify(
      dto.password,
      user.passwordHash,
    );
```

### 3. Do not merge `UserRepository` and `AuthRepository`

| Anti-pattern | Why rejected |
|--------------|--------------|
| Single repo for user CRUD + sign-in | Blurs projection boundary; risks exposing `passwordHash` on directory reads or scattering write paths in Auth |
| Auth importing `UserRepository` for sign-in | Couples Authentication to User Directory’s adapter; violates credentials-only read |
| User Directory reading full row with hash | Breaks least-privilege for admin/list APIs |

Keep **two adapters**, **one table**, **two projections**.

---

## Why the Shared Kernel exists today

1. **Single database, single deploy** — Reference monolith (~350 production statements); no product trigger to split IAM services ([roadmap G5/G6](./decomposition-planning-roadmap-user-auth.md)).
2. **Different read shapes** — Directory APIs must never leak secrets; Auth must read `passwordHash` once per sign-in.
3. **No cross-module persistence imports** — Coupling is **model** coupling (Prisma schema + field connascence), not service injection. Acceptable at current scale ([coupling analysis §2](./coupling-analysis-user-auth.md)).

Shared Kernel cost rises if you extract microservices: both contexts currently assume the same ORM model and migration timeline.

---

## Future: persistence ports (T7 / IAM-14–16)

Story 7 introduces explicit ports so the Shared Kernel stays documented while adapters become swappable:

| Port | Implemented by | Responsibility |
|------|----------------|----------------|
| `IUserDirectory` | `UserRepository` | CRUD + reads without `passwordHash` |
| `IUserCredentialsReader` | `AuthRepository` | Read-only lookup by email with `passwordHash` for verify |

**Goals:**

- Services depend on port interfaces (Symbol tokens), not concrete repositories.
- **No merge** of repositories; password omission rules unchanged.
- Prepare **Option B** ([domain analysis](./domain-analysis-user-auth.md)): linguistic split into UserDirectoryContext vs AccessControlContext with ACL/API instead of shared ORM models.

Until ports land, the rule above still applies: User Directory owns lifecycle; Auth uses credentials projection only via `AuthRepository`.

---

## Consequences

**Positive**

- Clear migration ownership for `User`.
- Safe default for HTTP user APIs (hash never in JSON).
- Documented boundary before ports and optional service extraction.

**Negative / trade-offs**

- Two Prisma adapters to maintain when schema changes (`email`, `passwordHash`, `role` must stay aligned).
- Shared Kernel remains a **deployment coupling** until split schema or credentials API exists.

**Verification (doc review)**

- [x] User Directory ownership of `User` lifecycle stated
- [x] Auth credentials projection only; no merge with `UserRepository`
- [x] Evidence cites `user.repository` omit vs `auth.repository` full row
- [x] T7 ports named as next step

---

## References

- [Domain analysis — Option B & duplicate `User` access](./domain-analysis-user-auth.md)
- [Coupling analysis — User Directory ↔ Authentication](./coupling-analysis-user-auth.md)
- [Common domain detection — do not merge repos](./common-domain-detection-user-auth.md)
- Feature tasks: [T4](../.specs/features/modular-monolith-iam/tasks.md) (this doc), [T7](../.specs/features/modular-monolith-iam/tasks.md) (ports)
