---
name: clean-arch-lite
description: >
  Pragmatic clean architecture for TypeScript modules using DI containers
  (NestJS, Fastify+tsyringe, Express+awilix, Inversify). Splits domain
  (entity, VO, events, ports) from infrastructure (ORM, hashing, JWT,
  HTTP adapters) without over-layering. Use when user wants clean
  architecture, dependency inversion, port/adapter, hexagonal architecture,
  testable services, isolated business logic, or asks how to structure a
  module to avoid framework coupling. Includes anti-bloat rules — when NOT
  to add a layer, interface, or mapper. Do NOT use for strategic DDD
  context mapping or pure architectural planning outside the module level.
---

# Clean Arch Lite

Pragmatic clean architecture. Goal: business logic isolated, DI everywhere, testable. Anti-goal: 10 files per string field.

Default framework in examples is NestJS, but the principles transfer to any DI-capable TS stack (tsyringe, awilix, Inversify).

## Core Premise

Three principles, in priority order:

1. **Business logic isolated** — domain layer has zero deps on framework (`@nestjs/*`), ORM (`@prisma/*`, `typeorm`), crypto/auth/HTTP libs.
2. **Dependency injection** — application services depend on **ports** (interfaces), not concrete infra.
3. **Testability** — domain compiles + tests run without booting a DI container.

Everything else is overhead. Add only when it serves these three.

## Workflow

| Intent | Load |
|--------|------|
| "how do I structure a module / clean arch / hexagonal?" | SKILL.md only |
| "show me an entity / port / adapter / test example" | + [reference.md](reference.md) |
| "is this over-engineered? how many layers do I need?" | + [anti-patterns.md](anti-patterns.md) |

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

**Flat application layer.** Sub-folders only for: `domain/`, `infrastructure/`, `dto/`, cross-cutting mechanisms (e.g., `authorization/`). Sub-folder per feature implies sub-context — only valid if true bounded context split.

## Decision Trees

### Need a port (interface)?

YES if it crosses an infra boundary: DB, hashing, JWT, clock, HTTP external, FS, queue, email, payment provider.
NO otherwise. Use the concrete class.

### Need a Value Object?

YES if there is validation OR comparison behavior (`Email.create`, `Money.add`).
NO if it is just a wrapped primitive with no behavior. Keep the primitive (`passwordHash: string`).

### Need a use-case class (`ConfirmOrderUseCase`)?

NO. Use a method on the application service.
Split only when method exceeds ~50 lines OR has multiple distinct variants.

### Need a separate `application/` folder?

NO. Application = controllers + services + DTOs at module root.

### Need a mapper class?

NO. Single `rehydrate(row)` static + `toPersistence()` instance method on the entity. Repo adapter calls them. Never one mapper per field.

## Anti-Bloat Rules

Headlines (full before/after in [anti-patterns.md](anti-patterns.md)):

- Adding 1 field = ~4 files (schema + entity + repo mapping + DTO). Acceptable. If you touched 8+, you over-layered.
- No mapper-per-field. No DTO-per-internal-state.
- No interface-per-class. Only at infra boundaries.
- No abstract base classes "for future extension." YAGNI.
- No empty `index.ts` barrels. Direct imports.
- No use-case class per method.
- No sub-folder per feature inside one module.

## DI Wiring (essentials)

- Port = `Symbol` token + `interface`, both exported from the same `*.port.ts` file.
- Module providers: `{ provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository }`.
- Service injects the port: `constructor(@Inject(ORDER_REPOSITORY) private repo: IOrderRepository) {}`.
- Never use string magic for tokens. Symbol prevents collisions.

For non-NestJS stacks the binding syntax differs (tsyringe `container.register`, awilix `asClass`), but the port + token + adapter shape is the same.

## Final Checklist

Before considering refactor done:

- [ ] Domain folder has zero imports from framework, ORM, or external libs (grep the dep names you actually use)
- [ ] Domain entity methods named in domain language (no `setX`)
- [ ] Application service depends on ports (DI tokens), not concrete infra classes
- [ ] One repository adapter per aggregate, only place importing the ORM
- [ ] Domain entity unit tests run without booting the DI container
- [ ] Adding a new field touched ≤4 files

## When NOT To Use This Pattern

- Modules with no business logic (pure CRUD passthrough). Stay anemic — don't invent invariants.
- One-off scripts, migrations, demos.
- Modules where the aggregate is owned by an external system (you are just a thin proxy).
