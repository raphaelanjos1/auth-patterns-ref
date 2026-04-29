---
name: clean-arch-lite
description: >
  Pragmatic clean architecture for NestJS modules. Splits domain (entity, VO,
  events, ports) from infrastructure (Prisma, JWT, argon2 adapters) without
  over-layering. Use when user wants clean architecture, dependency inversion,
  port/adapter, hexagonal architecture, testable services, isolated business
  logic, or asks how to structure a NestJS module to avoid framework coupling.
  Includes anti-bloat rules — when NOT to add a layer, interface, or mapper.
  Do NOT use for strategic DDD context mapping or pure architectural planning
  outside the module level.
---

# Clean Arch Lite — NestJS

Pragmatic clean architecture. Goal: business logic isolated, DI everywhere, testable. Anti-goal: 10 files per string field.

## Core Premise

Three principles, in order of priority:

1. **Business logic isolated** — domain layer zero deps on `@nestjs/*`, `@prisma/*`, hashing/jwt libs.
2. **Dependency injection** — application services depend on **ports** (interfaces), not concrete infra.
3. **Testability** — domain compiles + tests run without DI container.

Everything else is overhead. Add only when it serves these three.

## Module Layout

```
src/<module>/
├── domain/                      # core, zero infra deps
│   ├── <aggregate>.entity.ts
│   ├── value-objects/
│   ├── events/
│   └── ports/                   # interfaces (repo, hasher, clock, etc.)
├── infrastructure/              # adapters implementing ports
│   ├── prisma-<aggregate>.repository.ts
│   └── <other-adapter>.ts
├── <feature>.controller.ts      # FLAT — no sub-folders per concern
├── <feature>.service.ts         # application service
├── dto/
└── <module>.module.ts           # binds ports → adapters
```

**Flat application layer.** Sub-folders only for: `domain/`, `infrastructure/`, `dto/`, cross-cutting mechanisms (e.g. `authorization/`). Sub-folder per feature implies sub-context — only valid if true bounded context split.

## Decision Trees

### Need a port (interface)?

YES if it crosses an infra boundary: DB, hashing, JWT, clock, HTTP external, FS, queue, email, payment provider.
NO otherwise. Use the concrete class.

### Need a Value Object?

YES if there is validation OR comparison behavior (`Email.create`, `Money.add`).
NO if it is just a wrapped primitive with no behavior. Keep the primitive (`passwordHash: string`).

### Need a use-case-class (`CreateUserUseCase`)?

NO. Use a method on the application service.
Split only when method exceeds ~50 lines OR has multiple distinct variants.

### Need a separate `application/` folder?

NO. Application = controllers + services + DTOs at module root.

### Need a mapper class?

NO. Single `toDomain(row)` + `toPersistence()` lives on the entity / inside the repository adapter. Never one mapper per field.

## Domain Rules

- Entity owns state + behavior. No public setters. Methods named in domain language (`changeRole`, not `setRole`).
- Entity factories for creation: `User.register(input, hasher)` static. Constructor private.
- Rehydration factory for repo: `User.rehydrate(row)` static.
- Domain events: entity pushes to private `events: object[]`, app service drains via `pullEvents()` after persist, then publishes.
- Invariants enforced **inside** the entity. Service may pre-check (e.g., uniqueness via repo) but the entity is the last line of defense.
- Entity exposes `toPersistence()` (for repo) and `toJSON()` (for HTTP serialization). Avoid leaking VOs / private fields through controller responses.

## Infrastructure Rules

- Adapter classes implement port interfaces. NestJS `@Injectable()`, constructor injection.
- Repository adapter is the **only** place importing Prisma.
- Other adapters wrap external libs (argon2 → `IPasswordHasher`, JwtService → `ITokenIssuer`). Wrappers are 5-10 lines each.

## DI Wiring

- Port = `Symbol` token + `interface`. Both exported from same `*.port.ts` file.
- Module providers: `{ provide: USER_REPOSITORY, useClass: PrismaUserRepository }`.
- Application service: `constructor(@Inject(USER_REPOSITORY) private repo: IUserRepository) {}`.
- Never use string magic for tokens. Symbol prevents collisions.

## Anti-Bloat Rules

- Adding 1 string field = 4 files: Prisma schema + entity + repo mapping + DTO. Acceptable. If you find yourself touching 8+, you over-layered.
- No mapper-per-field. No DTO-per-internal-state.
- No interface-per-class. Only at infra boundaries.
- No abstract base classes "for future extension." YAGNI.
- No empty `index.ts` barrels. Direct imports.

## Example: Anemic → Rich

Before (service holds invariant):
```ts
async create(dto) {
  if (await repo.findByEmail(dto.email)) throw new ConflictException();
  const hash = await hasher.hash(dto.password);
  return repo.create({ ...dto, passwordHash: hash });
}
```

After (entity owns invariant + emits event):
```ts
async create(dto, performedBy?) {
  if (await repo.findByEmail(dto.email)) throw new ConflictException();
  const user = await User.register(dto, hasher);  // entity factory
  await repo.save(user);
  for (const e of user.pullEvents()) bus.emit(AUDIT, toAudit(e, performedBy));
  return user;
}
```

## Final Checklist

Before considering refactor done:

- [ ] `grep -r '@nestjs\|@prisma\|argon2\|jsonwebtoken' src/<module>/domain/` returns zero matches
- [ ] Domain entity has methods named in domain language (no `setX`)
- [ ] Application service depends on ports (`@Inject(SYMBOL_TOKEN)`), not concrete infra classes
- [ ] One repository adapter per aggregate, only place with Prisma
- [ ] Domain entity unit tests run **without** `Test.createTestingModule`
- [ ] Adding a new field touched ≤4 files

## When NOT To Use This Pattern

- Modules with no business logic (pure CRUD passthrough). Stay anemic — don't invent invariants.
- One-off scripts, migrations, demos.
- Modules where the aggregate is owned by an external system (you are just a thin proxy).
