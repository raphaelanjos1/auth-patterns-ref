# Audit Log Module

## Overview

The Audit Log module automatically records relevant application actions for traceability, compliance, and future metrics. It captures user CRUD operations and successful logins.

The module is completely **decoupled** from business logic, using an **event-driven** architecture with `@nestjs/event-emitter`. This ensures that audit failures never affect the API response.

## Data Model

### Table `audit_log`

| Field       | Type          | Description                              |
|-------------|---------------|------------------------------------------|
| id          | String (UUID) | Unique identifier for the record         |
| action      | AuditAction   | Type of action performed                 |
| entity_id   | String?       | ID of the entity affected by the action  |
| user_id     | String?       | ID of the user who performed the action  |
| metadata    | Json?         | Contextual data (before/after, etc.)     |
| created_at  | DateTime      | Record creation timestamp                |

### Enum `AuditAction`

| Value          | Description                      |
|----------------|----------------------------------|
| USER_CREATED   | A new user was created           |
| USER_UPDATED   | An existing user was modified    |
| USER_DELETED   | A user was removed               |
| AUTH_LOGIN     | Successful login                 |

## Field Semantics

### `userId` vs `entityId`

- **`userId`**: Who performed the action (the authenticated user)
- **`entityId`**: Which entity the action was performed on

**Examples:**

| Scenario                         | userId   | entityId     |
|----------------------------------|----------|--------------|
| Admin creates a user             | admin-id | new-user-id  |
| Admin updates another user       | admin-id | user-id      |
| Admin deletes a user             | admin-id | user-id      |
| User logs in                     | user-id  | user-id      |

In the `AUTH_LOGIN` case, both fields are equal because the user authenticates themselves.

## Event Flow

```
Controller
    |
    v
Service (UserService / AuthService)
    |
    | eventEmitter.emit('audit.log', AuditEvent)
    |
    v (asynchronous, does not block the response)
AuditLogService [@OnEvent('audit.log')]
    |
    v
AuditLogRepository
    |
    v
Database (audit_log table)
```

## Metadata Format

### USER_CREATED

Snapshot of the created user's fields:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "USER"
}
```

### USER_UPDATED

List of changed fields with before and after values:

```json
{
  "changes": [
    { "field": "fullName", "from": "John", "to": "John Doe" },
    { "field": "role", "from": "USER", "to": "MANAGER" }
  ]
}
```

### USER_DELETED

Snapshot of the user before removal (useful for investigation/recovery):

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "ADMIN"
}
```

### AUTH_LOGIN

Email used for login:

```json
{
  "email": "john@example.com"
}
```

## Error Handling

The listener uses `try/catch` to capture any errors during audit log writing. Errors are logged via NestJS `Logger` but **never propagated** to the original request. This means:

- If the audit database is down, the API continues working normally
- Failures are visible in application logs for monitoring

## How to Add New Actions

1. Add the new value to the `AuditAction` enum in `prisma/schema.prisma`
2. Run `npx prisma migrate dev` to create the migration
3. In the relevant IAM service, call the helper (do not import `AuditLogService`):

```typescript
import { publishAudit } from '../../audit-log/events/publish-audit';

publishAudit(this.eventEmitter, {
  action: 'NEW_ACTION',
  entityId,
  userId,
  metadata: { /* context */ },
});
```

4. `publishAudit` sets `schemaVersion` from [audit-contract.ts](../src/audit-log/contracts/audit-contract.ts). The `AuditLogService` listener persists events named `audit.log`.

## File Structure

```
src/audit-log/
├── audit-log.module.ts
├── audit-log.service.ts         # @OnEvent listener (async)
├── audit-log.repository.ts
├── contracts/
│   ├── audit-contract.ts        # AUDIT_CONTRACT_VERSION
│   └── audit-event.v1.schema.json
└── events/
    ├── audit.event.ts           # AUDIT_EVENT + AuditEvent class
    ├── audit-actions.ts         # typed actions (align with Prisma AuditAction)
    ├── publish-audit.ts         # IAM modules import this only
    └── index.ts
```

IAM modules (`user`, `auth`) may import **only** `audit-log/events/*` — see `yarn run check:boundaries`.
