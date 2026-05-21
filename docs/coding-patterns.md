# Coding Patterns

Living reference for the patterns used in [src/identity/](../src/identity/). New bounded contexts (e.g. `billing/`, `catalog/`) should mirror this shape unless they fall under [§ When NOT To Use](#when-not-to-use).

The rules here come from the [clean-arch-lite skill](../.claude/skills/clean-arch-lite/SKILL.md). This doc adds concrete identity-grounded examples so you don't have to re-read the skill + the module each time.

---

## Goals & Non-Goals

**Goals (in priority order):**

1. **Business logic isolated** — `domain/` has zero deps on `@nestjs/*`, `@prisma/*`, `argon2`, `jsonwebtoken`.
2. **Dependency injection everywhere** — application services depend on **ports** (interfaces), not concrete adapters.
3. **Testable** — domain entities and VOs compile + test without a DI container.

**Non-goals:**

- 10 files per string field.
- Mapper-per-field, DTO-per-internal-state.
- Use-case classes (`CreateUserUseCase`). A method on the service is enough until it grows past ~50 lines or splits into variants.
- A separate `application/` folder. Application = controllers + services + DTOs at the module root.

---

## Module Layout

```
src/<module>/
├── domain/                       # zero infra deps
│   ├── <aggregate>.entity.ts
│   ├── value-objects/
│   ├── events/
│   ├── ports/                    # interfaces (repo, hasher, clock, ...)
│   └── errors.ts
├── infrastructure/               # adapters implementing ports
│   ├── prisma-<aggregate>.repository.ts
│   └── <other-adapter>.ts
├── <feature>.controller.ts       # FLAT
├── <feature>.service.ts
├── dto/
├── authorization/                # only when module owns RBAC
└── <module>.module.ts            # binds ports → adapters
```

**Flat application root.** Sub-folders only for `domain/`, `infrastructure/`, `dto/`, and cross-cutting mechanisms (`authorization/`). A sub-folder per feature implies a sub-context — only valid if it is a real bounded-context split.

Canonical example: [src/identity/](../src/identity/).

---

## Domain Layer

### Entity

- **Private constructor.** Two static factories: `register(input, deps)` for creation and `rehydrate(row)` for loading from persistence.
- **No setters.** Mutators named in domain language: `applyUpdate`, `markDeleted`, `authenticate` — never `setX`.
- **Private `events: DomainEvent[]`.** Mutators push events. `pullEvents()` drains and clears the buffer; the application service calls it after `repo.save`.
- **`toPersistence()`** returns the shape the repo writes. **`toView()` / `toJSON()`** returns the shape the controller serializes (no `passwordHash`, VOs flattened to primitives).
- **Invariants live inside the entity.** The service may pre-check (e.g. uniqueness via repo), but the entity is the last line of defense (e.g. empty name → `InvalidUserNameError`).

Reference: [user.entity.ts](../src/identity/domain/user.entity.ts).

```ts
// user.entity.ts (excerpt)
private constructor(
  public readonly id: string,
  private _fullName: string,
  private _email: Email,
  private _passwordHash: string,
  private _role: UserRole,
) {}

static async register(input, hasher, performedBy = null) {
  const fullName = User.normalizeName(input.fullName);
  const email = Email.create(input.email);
  const passwordHash = await hasher.hash(input.password);
  const user = new User(randomUUID(), fullName, email, passwordHash, input.role);
  user.events.push(new UserCreatedEvent(user.id, performedBy, { ... }));
  return user;
}

static rehydrate(raw: UserPersistence): User { ... }

pullEvents(): DomainEvent[] {
  const out = this.events;
  this.events = [];
  return out;
}
```

### Value Objects

Use a VO **only when there is validation OR comparison behavior**. A wrapped primitive with no behavior stays a primitive (e.g. `passwordHash: string`).

- Private constructor + `static create(raw)` factory. Validation throws a domain error.
- Always expose `.value`. Add `.equals(other)`, `.toString()`, `.toJSON()`.
- Normalize on construction (e.g. `Email` lowercases + trims).

Reference: [email.vo.ts](../src/identity/domain/value-objects/email.vo.ts).

```ts
// email.vo.ts
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const v = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new InvalidEmailError(raw);
    return new Email(v);
  }

  equals(other: Email) { return this.value === other.value; }
  toJSON() { return this.value; }
}
```

### Domain Events

- Abstract `DomainEvent` base with `occurredAt`, `action`, `entityId`, `performedBy`, `metadata`. See [domain-event.ts](../src/identity/domain/events/domain-event.ts).
- One concrete event per business fact (`UserCreatedEvent`, `UserUpdatedEvent`, `UserDeletedEvent`, `UserSignedInEvent`).
- The constructor takes the data needed to compute `metadata`. Expose `metadata` as a getter so it stays lazy.
- Events are **plain objects in the domain layer.** Translation to the cross-module `AuditEvent` happens in the application service, not in the entity.

Reference: [user-created.event.ts](../src/identity/domain/events/user-created.event.ts).

### Ports

A **port** is the domain's interface to an infra capability. Follow this exact pattern:

- One `*.port.ts` file per port.
- Exports a `Symbol` token **and** the interface.
- The token name is `SCREAMING_SNAKE_CASE`, the interface name is `IPascalCase`.

```ts
// user.repository.port.ts
export const USER_REPOSITORY = Symbol('IUserRepository');
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(params: FindAllParams): Promise<FindAllResult>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}
```

**Add a port only when crossing an infra boundary** — DB, hashing, JWT, clock, HTTP external, FS, queue, email, payment provider. Do not create ports for in-process collaborators.

Reference: [user.repository.port.ts](../src/identity/domain/ports/user.repository.port.ts), [password-hasher.port.ts](../src/identity/domain/ports/password-hasher.port.ts), [token-issuer.port.ts](../src/identity/domain/ports/token-issuer.port.ts).

---

## Infrastructure Layer

- Adapter = `@Injectable()` class implementing a port interface.
- The repository adapter is the **only** place importing Prisma. It uses `Entity.rehydrate(row)` on read and `entity.toPersistence()` on write.
- External-lib wrappers (argon2, JWT) stay thin (≤ 20 LOC). Wrap, don't add policy.

Reference: [prisma-user.repository.ts](../src/identity/infrastructure/prisma-user.repository.ts), [argon2-password-hasher.ts](../src/identity/infrastructure/argon2-password-hasher.ts), [jwt-token-issuer.ts](../src/identity/infrastructure/jwt-token-issuer.ts).

```ts
// prisma-user.repository.ts (excerpt)
@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.client.user.findUnique({ where: { id } });
    return row ? User.rehydrate(row) : null;
  }

  async save(user: User): Promise<void> {
    const data = user.toPersistence();
    await this.prisma.client.user.upsert({
      where: { id: data.id },
      create: data,
      update: { fullName: data.fullName, email: data.email, passwordHash: data.passwordHash, role: data.role },
    });
  }
}
```

```ts
// argon2-password-hasher.ts (full)
@Injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  constructor(private readonly hashing: HashingService) {}
  hash(plain: string) { return this.hashing.hash(plain); }
  verify(plain: string, hash: string) { return this.hashing.verify(plain, hash); }
}
```

---

## Application Layer

### Service Orchestration

Standard flow for any write operation:

```
pre-check (uniqueness / existence)
  → entity factory or mutator
  → repo.save
  → entity.pullEvents()
  → publish events
  → return entity.toView()
```

- Inject ports via `@Inject(SYMBOL_TOKEN)`. Type the field as the interface (use `type` import to keep the boundary).
- Translate domain events to the cross-module `AuditEvent` here. The entity does not know about `EventEmitter2`.
- Throw NestJS HTTP exceptions (`ConflictException`, `NotFoundException`, `UnauthorizedException`) at this layer; map domain errors (`InvalidCredentialsError`) into them.

Reference: [auth.service.ts](../src/identity/auth.service.ts), [user.service.ts](../src/identity/user.service.ts).

```ts
// user.service.ts (excerpt)
async create(dto: CreateUserDto, performedBy?: string): Promise<UserView> {
  const existing = await this.userRepository.findByEmail(dto.email);
  if (existing) throw new ConflictException('Email already in use');

  const user = await User.register(dto, this.hasher, performedBy ?? null);
  await this.userRepository.save(user);
  this.publishEvents(user.pullEvents());
  return user.toView();
}
```

### Controller

- Pass-through. No business logic, no manual DTO mapping.
- Decorators only: `@Public`, `@Throttle`, `@CheckPermissions`, `@ApiTags`.
- Extract `performedBy` from `req['user']?.sub` and forward to the service.

Reference: [auth.controller.ts](../src/identity/auth.controller.ts), [user.controller.ts](../src/identity/user.controller.ts).

---

## DI Wiring

Module providers bind each Symbol to a concrete adapter. No factories or conditionals unless you have a real reason.

```ts
// identity.module.ts (excerpt)
providers: [
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
  { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  AuthService,
  UserService,
  AbilityFactory,
],
```

Reference: [identity.module.ts](../src/identity/identity.module.ts).

---

## Authorization (Cross-Cutting)

Use this shape when a module owns RBAC. It lives in `<module>/authorization/` so it stays close to the policy it expresses, not in a global folder.

Pieces:

- `action.enum.ts` + `subject.enum.ts` — type-safe action/subject pairs.
- `policy-map.ts` — static `role → permissions[]` matrix.
- `ability-factory.ts` — builds an ability object from a role.
- `check-permissions.decorator.ts` — `@CheckPermissions({ action, subject })` via `SetMetadata`.
- `permissions.guard.ts` — reads metadata via `Reflector`, calls `abilityFactory.createForRole(req.user.role)`, throws `ForbiddenException` if denied.
- `index.ts` — single barrel for the public surface (`Action`, `Subject`, `CheckPermissions`).

Reference: [src/identity/authorization/](../src/identity/authorization/).

---

## DTOs

- Naming: `<Operation|Entity>(Dto|Query)` — `CreateUserDto`, `UpdateUserDto`, `SignInDto`, `FindAllUsersQueryDto`.
- `class-validator` built-ins only (`@IsEmail`, `@IsNotEmpty`, `@IsOptional`, `@IsEnum`). Add a custom decorator only when reused 3+ times.
- DTOs are wire-format types, not domain types. Don't reuse them as entity inputs unless the shape happens to match (it usually does for `CreateXDto`).

Reference: [src/identity/dto/](../src/identity/dto/).

---

## Tests

Two layers, two strategies:

### Domain tests = pure

No `Test.createTestingModule`. Hand-roll fakes for ports. The domain compiles and runs without Nest, so tests should too.

```ts
// user.entity.spec.ts (excerpt)
const fakeHasher = (overrides = {}) => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  verify: jest.fn().mockResolvedValue(true),
  ...overrides,
});

it('creates a user, hashes password, emits UserCreatedEvent', async () => {
  const user = await User.register({ ... }, fakeHasher(), 'admin-1');
  expect(user.pullEvents()[0]).toBeInstanceOf(UserCreatedEvent);
});
```

Reference: [user.entity.spec.ts](../src/identity/domain/user.entity.spec.ts).

### Service tests = NestJS container

Services need Symbol injection + `EventEmitter2`. Use `Test.createTestingModule` with `{ provide: SYMBOL, useValue: mock }`. Pull mocks back via `module.get(SYMBOL)`.

Reference: [auth.service.spec.ts](../src/identity/auth.service.spec.ts).

---

## Anti-Bloat Rules

- Adding **one** string field should touch ~4 files: Prisma schema + entity + repo mapping + DTO. If you find yourself touching 8+, you over-layered.
- **No mapper-per-field.** `Entity.toPersistence()` and `Entity.rehydrate(row)` are the mappers.
- **No interface-per-class.** Only at infra boundaries.
- **No abstract base classes "for future extension."** YAGNI.
- **No empty `index.ts` barrels.** A barrel is fine when it scopes a sub-system's public surface (see `authorization/index.ts`); empty barrels are not.
- **No use-case classes.** A service method is enough until it crosses ~50 LOC or splits into variants.

Identity scoreboard (proof the rules hold):

- One aggregate (`User`), one repo adapter, ~15 core domain + infra files.
- `Argon2PasswordHasher` = 16 LOC. `JwtTokenIssuer` = 12 LOC. Adapters stay thin.
- Adding a new field on `User` touches: `prisma.schema`, `user.entity.ts`, `prisma-user.repository.ts` (`save`), `create-user.dto.ts` / `update-user.dto.ts`. ✅

---

## New-Module Checklist

Before considering a new module's refactor done:

- [ ] `grep -r '@nestjs\|@prisma\|argon2\|jsonwebtoken' src/<module>/domain/` returns zero matches.
- [ ] Domain entity has methods named in domain language (no `setX`).
- [ ] Application service depends on ports via `@Inject(SYMBOL_TOKEN)`, not concrete classes.
- [ ] One repository adapter per aggregate; only place that imports Prisma.
- [ ] Domain entity unit tests run **without** `Test.createTestingModule`.
- [ ] Adding a new field touches ≤ 4 files.
- [ ] Module providers bind every port Symbol to a concrete adapter via `useClass`.
- [ ] Controller is pass-through; no business logic.
- [ ] Domain events drained via `pullEvents()` after `save`, translated to `AuditEvent` in the service.

Modules pending migration to this pattern: track them in commits / PR titles, not here.

---

## When NOT To Use

- **Pure CRUD passthrough modules with no invariants.** Stay anemic — don't invent business rules to justify an entity.
- **One-off scripts, migrations, demos.** No DI, no ports.
- **Thin proxies over an external system** where the aggregate is owned upstream. Don't model state you don't own.
