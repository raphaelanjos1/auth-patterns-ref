# Audit Log Module

## Visao Geral

O modulo Audit Log registra automaticamente acoes relevantes da aplicacao para fins de rastreabilidade, compliance e metricas futuras. Ele captura operacoes CRUD de usuarios e logins bem-sucedidos.

O modulo e completamente **desacoplado** da logica de negocios, utilizando uma arquitetura **event-driven** com `@nestjs/event-emitter`. Isso garante que falhas no audit nunca afetem a resposta da API.

## Modelo de Dados

### Tabela `audit_log`

| Campo       | Tipo          | Descricao                              |
|-------------|---------------|----------------------------------------|
| id          | String (UUID) | Identificador unico do registro        |
| action      | AuditAction   | Tipo da acao realizada                  |
| entity_id   | String?       | ID da entidade afetada pela acao        |
| user_id     | String?       | ID do usuario que realizou a acao       |
| metadata    | Json?         | Dados contextuais (antes/depois, etc.)  |
| created_at  | DateTime      | Timestamp de criacao do registro        |

### Enum `AuditAction`

| Valor          | Descricao                        |
|----------------|----------------------------------|
| USER_CREATED   | Um novo usuario foi criado       |
| USER_UPDATED   | Um usuario existente foi alterado|
| USER_DELETED   | Um usuario foi removido          |
| AUTH_LOGIN     | Login bem-sucedido               |

## Semantica dos Campos

### `userId` vs `entityId`

- **`userId`**: Quem realizou a acao (o usuario autenticado)
- **`entityId`**: Sobre qual entidade a acao foi realizada

**Exemplos:**

| Cenario                          | userId   | entityId |
|----------------------------------|----------|----------|
| Admin cria um usuario            | admin-id | novo-user-id |
| Admin atualiza outro usuario     | admin-id | user-id  |
| Admin deleta um usuario          | admin-id | user-id  |
| Usuario faz login                | user-id  | user-id  |

No caso de `AUTH_LOGIN`, ambos os campos sao iguais pois o usuario autentica a si mesmo.

## Fluxo de Eventos

```
Controller
    |
    v
Service (UserService / AuthService)
    |
    | eventEmitter.emit('audit.log', AuditEvent)
    |
    v (assincrono, nao bloqueia a resposta)
AuditLogService [@OnEvent('audit.log')]
    |
    v
AuditLogRepository
    |
    v
Banco de Dados (tabela audit_log)
```

## Formato do Metadata

### USER_CREATED

Snapshot dos campos do usuario criado:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "USER"
}
```

### USER_UPDATED

Lista de campos alterados com valores antes e depois:

```json
{
  "changes": [
    { "field": "fullName", "from": "John", "to": "John Doe" },
    { "field": "role", "from": "USER", "to": "MANAGER" }
  ]
}
```

### USER_DELETED

Snapshot do usuario antes da remocao (util para investigacao/recuperacao):

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "ADMIN"
}
```

### AUTH_LOGIN

Email utilizado no login:

```json
{
  "email": "john@example.com"
}
```

## Tratamento de Erros

O listener utiliza `try/catch` para capturar qualquer erro durante a escrita do audit log. Erros sao logados via `Logger` do NestJS mas **nunca propagados** para a requisicao original. Isso significa que:

- Se o banco de audit estiver fora, a API continua funcionando normalmente
- Falhas sao visiveis nos logs da aplicacao para monitoramento

## Como Adicionar Novas Acoes

1. Adicione o novo valor ao enum `AuditAction` em `prisma/schema.prisma`
2. Execute `npx prisma migrate dev` para criar a migration
3. No service relevante, emita o evento:

```typescript
import { AUDIT_EVENT, AuditEvent } from '../audit-log/events/audit.event';

this.eventEmitter.emit(
  AUDIT_EVENT,
  new AuditEvent('NOVA_ACAO', entityId, userId, { /* metadata */ }),
);
```

4. O `AuditLogService` captura automaticamente qualquer evento emitido com o nome `audit.log`

## Estrutura de Arquivos

```
src/audit-log/
├── audit-log.module.ts          # Modulo NestJS
├── audit-log.service.ts         # Listener de eventos
├── audit-log.service.spec.ts    # Testes unitarios
├── audit-log.repository.ts      # Acesso ao banco (Prisma)
└── events/
    └── audit.event.ts           # Classe de evento e constante
```
