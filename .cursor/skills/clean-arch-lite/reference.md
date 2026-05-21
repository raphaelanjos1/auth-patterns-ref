# Clean Arch Lite — Reference

Detailed examples. Domain used throughout: **Order** with `Money` VO, `OrderConfirmed` event, `IOrderRepository` port, Prisma adapter. Adapt names and ORM/framework to your context.

---

## Domain Entity

Owns state + behavior. No public setters. Methods named in domain language.

```typescript
// src/orders/domain/order.entity.ts
import { Money } from './value-objects/money';
import { OrderId } from './value-objects/order-id';
import { OrderConfirmed } from './events/order-confirmed';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export class Order {
  private readonly events: object[] = [];

  private constructor(
    readonly id: OrderId,
    private status: OrderStatus,
    private total: Money,
  ) {}

  static create(input: { id: OrderId; total: Money }): Order {
    return new Order(input.id, 'PENDING', input.total);
  }

  static rehydrate(row: {
    id: string;
    status: string;
    totalAmount: number;
    currency: string;
  }): Order {
    return new Order(
      new OrderId(row.id),
      row.status as OrderStatus,
      new Money(row.totalAmount, row.currency),
    );
  }

  confirm(): void {
    if (this.status !== 'PENDING') {
      throw new Error('Only pending orders can be confirmed.');
    }
    this.status = 'CONFIRMED';
    this.events.push(new OrderConfirmed(this.id));
  }

  pullEvents(): object[] {
    return this.events.splice(0);
  }

  toPersistence() {
    return {
      id: this.id.toString(),
      status: this.status,
      totalAmount: this.total.amount,
      currency: this.total.currency,
    };
  }

  toJSON() {
    return { id: this.id.toString(), status: this.status, total: this.total };
  }
}
```

**Rules**:
- Constructor private; static factories: `create` (new) and `rehydrate` (from persistence).
- Invariants enforced inside the entity. Service may pre-check (e.g., uniqueness via repo) but the entity is the last line of defense.
- Events pushed to private array; app service drains via `pullEvents()` after persist, then publishes.
- Expose `toPersistence()` (for repo) and `toJSON()` (for HTTP serialization). Don't leak VOs / private fields through controller responses.

---

## Value Object

```typescript
// src/orders/domain/value-objects/money.ts
export class Money {
  constructor(readonly amount: number, readonly currency: string) {
    if (amount < 0) throw new Error('Amount cannot be negative');
    if (!currency) throw new Error('Currency required');
  }
  add(other: Money): Money {
    if (this.currency !== other.currency) throw new Error('Currency mismatch');
    return new Money(this.amount + other.amount, this.currency);
  }
  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

All fields `readonly`. Methods return new instances. Validates on construction.

---

## Port (interface) + Symbol token

```typescript
// src/orders/domain/ports/order-repository.port.ts
import { Order } from '../order.entity';
import { OrderId } from '../value-objects/order-id';

export const ORDER_REPOSITORY = Symbol('ORDER_REPOSITORY');

export interface IOrderRepository {
  findById(id: OrderId): Promise<Order | null>;
  save(order: Order): Promise<void>;
}
```

**Rules**:
- Symbol token + interface co-located in the same `*.port.ts` file.
- Symbol prevents collisions; never use string magic for tokens.
- Port lives in `domain/ports/`, has zero infra imports.

---

## Repository Adapter

The **only** place importing the ORM.

```typescript
// src/orders/infrastructure/prisma-order.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IOrderRepository } from '../domain/ports/order-repository.port';
import { Order } from '../domain/order.entity';
import { OrderId } from '../domain/value-objects/order-id';

@Injectable()
export class PrismaOrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: OrderId): Promise<Order | null> {
    const row = await this.prisma.order.findUnique({
      where: { id: id.toString() },
    });
    return row ? Order.rehydrate(row) : null;
  }

  async save(order: Order): Promise<void> {
    const data = order.toPersistence();
    await this.prisma.order.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }
}
```

---

## Other Adapters

Wrap external libs in thin port implementations (5-10 lines each).

```typescript
// src/orders/infrastructure/argon2-password-hasher.ts
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { IPasswordHasher } from '../domain/ports/password-hasher.port';

@Injectable()
export class Argon2PasswordHasher implements IPasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain);
  }
  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
```

```typescript
// src/orders/infrastructure/system-clock.ts
import { Injectable } from '@nestjs/common';
import { IClock } from '../domain/ports/clock.port';

@Injectable()
export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
```

---

## Module Wiring

```typescript
// src/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ORDER_REPOSITORY } from './domain/ports/order-repository.port';
import { CLOCK } from './domain/ports/clock.port';
import { PrismaOrderRepository } from './infrastructure/prisma-order.repository';
import { SystemClock } from './infrastructure/system-clock';

@Module({
  controllers: [OrdersController],
  providers: [
    OrdersService,
    { provide: ORDER_REPOSITORY, useClass: PrismaOrderRepository },
    { provide: CLOCK, useClass: SystemClock },
  ],
})
export class OrdersModule {}
```

For non-NestJS stacks:
- **tsyringe**: `container.register(ORDER_REPOSITORY, { useClass: PrismaOrderRepository })` + `@inject(ORDER_REPOSITORY)` on the service constructor.
- **awilix**: `container.register({ orderRepository: asClass(PrismaOrderRepository) })` + constructor destructuring (`{ orderRepository }`).
- **Inversify**: `container.bind<IOrderRepository>(ORDER_REPOSITORY).to(PrismaOrderRepository)` + `@inject(ORDER_REPOSITORY)`.

---

## Application Service

Thin coordinator. Loads aggregate, calls a domain method, persists, publishes events.

```typescript
// src/orders/orders.service.ts
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EventBus } from '../shared/event-bus';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from './domain/ports/order-repository.port';
import { OrderId } from './domain/value-objects/order-id';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: IOrderRepository,
    private readonly bus: EventBus,
  ) {}

  async confirm(id: string): Promise<void> {
    const order = await this.repo.findById(new OrderId(id));
    if (!order) throw new NotFoundException();
    order.confirm();                         // entity owns invariant
    await this.repo.save(order);
    for (const e of order.pullEvents()) this.bus.emit(e);
  }
}
```

---

## Anemic → Rich Refactor

Before (service holds invariant):

```typescript
async confirm(id: string) {
  const order = await this.repo.findById(id);
  if (!order) throw new NotFoundException();
  if (order.status !== 'PENDING') throw new ConflictException();
  order.status = 'CONFIRMED';
  await this.repo.save(order);
  this.bus.emit({ type: 'OrderConfirmed', orderId: id });
}
```

After (entity owns invariant + emits event):

```typescript
async confirm(id: string) {
  const order = await this.repo.findById(new OrderId(id));
  if (!order) throw new NotFoundException();
  order.confirm();
  await this.repo.save(order);
  for (const e of order.pullEvents()) this.bus.emit(e);
}
```

Differences:
- Status check + transition + event creation moved into `Order.confirm()`.
- Service is now a thin coordinator: load → call domain method → save → publish.

---

## Tests

### Domain test — no DI container

```typescript
// src/orders/domain/order.entity.spec.ts
import { Order } from './order.entity';
import { OrderId } from './value-objects/order-id';
import { Money } from './value-objects/money';
import { OrderConfirmed } from './events/order-confirmed';

describe('Order', () => {
  it('confirms a pending order and emits OrderConfirmed', () => {
    const order = Order.create({
      id: new OrderId('o-1'),
      total: new Money(100, 'USD'),
    });
    order.confirm();
    const events = order.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(OrderConfirmed);
  });

  it('rejects confirming a non-pending order', () => {
    const order = Order.create({
      id: new OrderId('o-1'),
      total: new Money(100, 'USD'),
    });
    order.confirm();
    expect(() => order.confirm()).toThrow();
  });
});
```

No `Test.createTestingModule`, no mocks for ports — the entity has no infra deps. Hand-roll fakes when a domain method takes a port.

### Service test — DI container with port mocked

```typescript
// src/orders/orders.service.spec.ts
import { Test } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import {
  ORDER_REPOSITORY,
  IOrderRepository,
} from './domain/ports/order-repository.port';
import { EventBus } from '../shared/event-bus';
import { Order } from './domain/order.entity';
import { OrderId } from './domain/value-objects/order-id';
import { Money } from './domain/value-objects/money';

describe('OrdersService', () => {
  let service: OrdersService;
  let repo: jest.Mocked<IOrderRepository>;
  let bus: { emit: jest.Mock };

  beforeEach(async () => {
    repo = { findById: jest.fn(), save: jest.fn() };
    bus = { emit: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: ORDER_REPOSITORY, useValue: repo },
        { provide: EventBus, useValue: bus },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it('confirms an order and publishes events', async () => {
    const order = Order.create({
      id: new OrderId('o-1'),
      total: new Money(100, 'USD'),
    });
    repo.findById.mockResolvedValue(order);
    await service.confirm('o-1');
    expect(repo.save).toHaveBeenCalledWith(order);
    expect(bus.emit).toHaveBeenCalled();
  });
});
```

Service test boots a DI container with the port stubbed via `useValue`. Prefer real implementations over mocks when a real DB / clock is available — only mock at boundaries you don't control.
