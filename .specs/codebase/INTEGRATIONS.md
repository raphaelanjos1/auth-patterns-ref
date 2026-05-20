# External Integrations

## Database

**Service:** PostgreSQL 17 (local via Docker Compose)  
**Purpose:** Persistência de `User` e `AuditLog`  
**Implementation:** `PrismaService` em `src/shared/database/`  
**Configuration:** `DATABASE_URL` em `.env`  
**Authentication:** Credenciais na connection string

## In-Process Event Bus

**Service:** `@nestjs/event-emitter`  
**Purpose:** IAM publica audit sem acoplamento direto ao `AuditLogService`  
**Implementation:** `EventEmitterModule.forRoot()` em `AppModule`; `AUDIT_EVENT` em `audit-log/events/audit.event.ts`  
**Configuration:** Default (sync handlers)

## JWT (internal)

**Service:** `@nestjs/jwt`  
**Purpose:** Access tokens Bearer  
**Implementation:** `JwtModule.register({ global: true, secret: process.env.JWT_SECRET, expiresIn: '5m' })`  
**Configuration:** `JWT_SECRET` env

## Password Hashing (internal)

**Service:** Argon2 via `HashingService`  
**Purpose:** Hash/verify com pepper  
**Implementation:** `src/shared/hashing/`  
**Configuration:** `ARGON2_PEPPER` env

## API Documentation

**Service:** Swagger UI  
**Purpose:** Documentação interativa  
**Implementation:** `src/shared/swagger/setup.ts`  
**Endpoint:** `/docs` quando app rodando

## API Integrations

Nenhuma API HTTP externa (OAuth providers, email, etc.) no escopo atual.

## Webhooks

Nenhum.

## Background Jobs

Nenhuma fila (Bull, SQS, etc.). Audit é síncrono via event emitter.
