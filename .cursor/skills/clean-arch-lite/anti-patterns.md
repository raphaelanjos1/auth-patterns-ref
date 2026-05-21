# Clean Arch Lite — Anti-Patterns

Concrete cases of over-layering to avoid. Each shows the bloat and the lean replacement.

---

## 1. Use-Case Class Per Method

❌ One class per operation, indirection without payoff.

```
src/orders/
└── application/
    ├── create-order.use-case.ts
    ├── confirm-order.use-case.ts
    ├── cancel-order.use-case.ts
    └── refund-order.use-case.ts
```

```typescript
@Injectable()
export class ConfirmOrderUseCase {
  constructor(@Inject(ORDER_REPOSITORY) private repo: IOrderRepository) {}
  async execute(id: string) { /* 8 lines */ }
}
```

✅ Methods on a single application service.

```typescript
@Injectable()
export class OrdersService {
  constructor(@Inject(ORDER_REPOSITORY) private repo: IOrderRepository) {}
  async create(dto: CreateOrderDto) { /* ... */ }
  async confirm(id: string)         { /* ... */ }
  async cancel(id: string)          { /* ... */ }
  async refund(id: string)          { /* ... */ }
}
```

Split into a separate class **only** when a method exceeds ~50 lines or has multiple distinct variants.

---

## 2. Mapper Per Field / Layer

❌ Dedicated mapper class shuffling fields one by one.

```typescript
export class OrderMapper {
  static toDomainId(row)     { return new OrderId(row.id); }
  static toDomainStatus(row) { return row.status; }
  static toDomainTotal(row)  { return new Money(row.totalAmount, row.currency); }
  static toDomain(row) {
    return new Order(
      this.toDomainId(row),
      this.toDomainStatus(row),
      this.toDomainTotal(row),
    );
  }
}
```

✅ One `rehydrate` static on the entity, one `toPersistence()` instance method. Repo adapter calls them directly.

```typescript
class Order {
  static rehydrate(row) { /* one place */ }
  toPersistence()       { /* one place */ }
}
```

---

## 3. Interface Per Class

❌ `IOrdersService` mirroring `OrdersService` 1:1 with no second implementer in sight.

```typescript
export interface IOrdersService {
  confirm(id: string): Promise<void>;
}
@Injectable()
export class OrdersService implements IOrdersService { /* ... */ }
```

✅ Inject the concrete class. Interfaces only at **infra boundaries** (repo, hasher, clock, external HTTP, queue, email, payment).

```typescript
@Injectable()
export class OrdersService { /* ... */ }
// controller
constructor(private orders: OrdersService) {}
```

---

## 4. Separate `application/` Folder

❌ Sub-folder dedicated to "the application layer."

```
src/orders/
├── application/
│   ├── orders.service.ts
│   ├── orders.controller.ts
│   └── dto/
├── domain/
└── infrastructure/
```

✅ Flat module root. Application = controllers + services + DTOs at the root.

```
src/orders/
├── orders.controller.ts
├── orders.service.ts
├── dto/
├── domain/
└── infrastructure/
```

---

## 5. Sub-Folder Per Feature

❌ `src/orders/confirm/`, `src/orders/refund/`, each with its own service+controller. Implies a sub-context that doesn't actually exist.

✅ One controller + one service for the aggregate. Split into a new module only when the aggregate genuinely changes (different bounded context, different lifecycle, different team owns it).

---

## 6. Empty `index.ts` Barrels

❌ `domain/index.ts` re-exporting every entity/VO. Costs build time, hides actual deps, breaks tree-shaking, creates circular import landmines.

```typescript
// domain/index.ts
export * from './order.entity';
export * from './value-objects/money';
export * from './events/order-confirmed';
```

✅ Direct imports.

```typescript
import { Order } from '../domain/order.entity';
import { Money } from '../domain/value-objects/money';
```

---

## 7. Abstract Base Class "For Future Extension"

❌ `BaseEntity`, `BaseRepository`, `BaseUseCase` invented before a second concrete subclass exists.

```typescript
abstract class BaseEntity<TId> {
  protected events: DomainEvent[] = [];
  pullEvents() { return this.events.splice(0); }
  abstract toPersistence(): unknown;
}
class Order extends BaseEntity<OrderId> { /* ... */ }
```

✅ Inline the 3 lines. Extract a base only when the third concrete subclass appears (rule of three).

---

## 8. DTO Per Internal State Transition

❌ `OrderPendingDto`, `OrderConfirmedDto`, `OrderCancelledDto` — internal status leaking into the public contract.

✅ One `OrderResponseDto` with a `status` field. Internal state is internal; HTTP shape is stable.

---

## 9. Port For A Pure Function

❌ `IPriceFormatter` interface + `DefaultPriceFormatter` adapter + Symbol token, for a function that does `n.toFixed(2)`.

✅ Direct call. Ports are for **infra boundaries** (DB, network, FS, clock, crypto). A pure function with no I/O is just a function.

```typescript
export const formatPrice = (m: Money) => `${m.amount.toFixed(2)} ${m.currency}`;
```

---

## 10. Anemic VO With No Behavior

❌ `class CustomerId { constructor(readonly value: string) {} }` — wraps a string with no validation, no comparison, no methods.

✅ Keep it as a primitive (`customerId: string`) until validation or comparison behavior is needed. Then promote to a VO.

---

## Summary Heuristic

If adding **one new field** touches more than **4 files** (schema + entity + repo mapping + DTO), you over-layered. Inline mappers, drop redundant interfaces, collapse use-case classes back into the service.
