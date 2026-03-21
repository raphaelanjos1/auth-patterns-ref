# Autorizacao (RBAC com permissoes granulares)

## Visao geral

O sistema de autorizacao utiliza um modelo **RBAC with Permissions** — as roles
do usuario sao mapeadas para permissoes discretas (action + subject), e a
decisao de acesso e baseada nessas permissoes, nao na role diretamente.

Isso permite que a matriz de permissoes evolua sem alterar guards ou controllers.

## Conceitos

| Conceito       | Descricao                                                   | Exemplo                          |
|----------------|-------------------------------------------------------------|----------------------------------|
| **Action**     | Operacao que pode ser realizada                             | `CREATE`, `READ`, `UPDATE`, `DELETE` |
| **Subject**    | Recurso sobre o qual a acao e realizada                     | `User`                           |
| **Policy Map** | Matriz declarativa que define permissoes por role           | `ADMIN → [CREATE, READ, ...]`    |
| **Ability**    | Objeto gerado para um usuario com metodos `can`/`cannot`   | `ability.can(READ, User) → true` |
| **Guard**      | Protege endpoints verificando permissoes via ability        | `PermissionsGuard`               |

## Fluxo de autorizacao

```
Request com Bearer token
        |
        v
   AuthGuard
   (valida JWT, injeta request.user com { sub, email, role })
        |
        v
   PermissionsGuard
        |--- Le metadata @CheckPermissions do endpoint
        |--- Se nao tem metadata, permite acesso (rota sem restricao)
        |--- Extrai role do request.user
        |--- Chama AbilityFactory.createForRole(role)
        |--- Verifica ability.can(action, subject)
        |
    +---+---+
    |       |
  can()   cannot()
    |       |
    v       v
  200     403 Forbidden
```

## Matriz de permissoes atual

| Action / Role | ADMIN | MANAGER | USER |
|---------------|:-----:|:-------:|:----:|
| User:CREATE   |  ✅   |   ✅    |  ❌  |
| User:READ     |  ✅   |   ✅    |  ✅  |
| User:UPDATE   |  ✅   |   ✅    |  ❌  |
| User:DELETE   |  ✅   |   ❌    |  ❌  |

Definida em `src/auth/authorization/policy-map.ts`:

```typescript
export const POLICY_MAP: Record<UserRole, Permission[]> = {
  ADMIN: [
    { action: Action.CREATE, subject: Subject.USER },
    { action: Action.READ, subject: Subject.USER },
    { action: Action.UPDATE, subject: Subject.USER },
    { action: Action.DELETE, subject: Subject.USER },
  ],
  MANAGER: [
    { action: Action.CREATE, subject: Subject.USER },
    { action: Action.READ, subject: Subject.USER },
    { action: Action.UPDATE, subject: Subject.USER },
  ],
  USER: [{ action: Action.READ, subject: Subject.USER }],
};
```

## Como proteger um endpoint

Aplique o decorator `@CheckPermissions` na rota:

```typescript
import { Action, CheckPermissions, Subject } from '../auth/authorization';

@Controller('user')
export class UserController {
  @Get()
  @CheckPermissions({ action: Action.READ, subject: Subject.USER })
  findAll() { }

  @Post()
  @CheckPermissions({ action: Action.CREATE, subject: Subject.USER })
  create() { }

  @Patch(':id')
  @CheckPermissions({ action: Action.UPDATE, subject: Subject.USER })
  update() { }
}
```

Rotas **sem** `@CheckPermissions` sao acessiveis a qualquer usuario autenticado
(o `PermissionsGuard` permite acesso quando nao encontra metadata).

## Componentes

### Action (`action.enum.ts`)

Enum com as operacoes disponiveis:

```typescript
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
}
```

### Subject (`subject.enum.ts`)

Enum com os recursos do sistema:

```typescript
export enum Subject {
  USER = 'User',
}
```

Para adicionar um novo recurso, basta incluir no enum e expandir o `POLICY_MAP`.

### AbilityFactory (`ability-factory.ts`)

Servico injetavel que gera um objeto `Ability` a partir da role do usuario:

```typescript
const ability = abilityFactory.createForRole('MANAGER');
ability.can(Action.READ, Subject.USER);    // true
ability.can(Action.DELETE, Subject.USER);  // false
ability.cannot(Action.DELETE, Subject.USER); // true
```

### CheckPermissions (`check-permissions.decorator.ts`)

Decorator que define o `PermissionRequirement` (action + subject) como metadata
da rota, consumido pelo `PermissionsGuard`.

### PermissionsGuard (`permissions.guard.ts`)

Guard global registrado em `AppModule` via `APP_GUARD`. Ordem de execucao
dos guards globais:

```
1. AuthGuard        → valida JWT
2. PermissionsGuard → verifica permissoes
3. ThrottlerGuard   → rate limiting
```

O guard:

1. Le o `PermissionRequirement` do metadata da rota via `Reflector`
2. Se nao ha metadata, retorna `true` (rota sem restricao de permissao)
3. Extrai o usuario de `request['user']` (injetado pelo `AuthGuard`)
4. Gera a `Ability` via `AbilityFactory.createForRole(user.role)`
5. Verifica `ability.can(action, subject)`
6. Retorna `403 Forbidden` se o usuario nao tem permissao

## Estrutura de arquivos

```
src/auth/authorization/
  index.ts                      — Barrel exports
  action.enum.ts                — Enum de acoes (CREATE, READ, UPDATE, DELETE)
  subject.enum.ts               — Enum de recursos (USER)
  policy-map.ts                 — Matriz role → permissoes
  ability-factory.ts            — Gera Ability com can()/cannot()
  check-permissions.decorator.ts — Decorator @CheckPermissions
  permissions.guard.ts          — Guard global que verifica permissoes
```

## Como adicionar um novo recurso

Exemplo: adicionar autorizacao para um recurso `Product`.

**1. Adicionar ao enum de subjects:**

```typescript
export enum Subject {
  USER = 'User',
  PRODUCT = 'Product',
}
```

**2. Expandir o policy map:**

```typescript
export const POLICY_MAP: Record<UserRole, Permission[]> = {
  ADMIN: [
    // ... permissoes existentes
    { action: Action.CREATE, subject: Subject.PRODUCT },
    { action: Action.READ, subject: Subject.PRODUCT },
    { action: Action.UPDATE, subject: Subject.PRODUCT },
    { action: Action.DELETE, subject: Subject.PRODUCT },
  ],
  MANAGER: [
    // ... permissoes existentes
    { action: Action.CREATE, subject: Subject.PRODUCT },
    { action: Action.READ, subject: Subject.PRODUCT },
  ],
  USER: [
    // ... permissoes existentes
    { action: Action.READ, subject: Subject.PRODUCT },
  ],
};
```

**3. Aplicar no controller:**

```typescript
@Get()
@CheckPermissions({ action: Action.READ, subject: Subject.PRODUCT })
findAll() { }
```

## Classificacao do modelo

| Conceito                                  | Modelo                | Presente |
|-------------------------------------------|-----------------------|:--------:|
| Permissoes derivadas de role              | RBAC                  |    ✅    |
| Action + Subject (verbo + recurso)        | Permission-Based      |    ✅    |
| Policy map declarativo                    | Policy-Based          |    ✅    |
| `can()` / `cannot()` (ability)            | Inspirado em ABAC/CASL|    ✅    |
| Atributos do recurso (ex: "dono do dado") | ABAC                  |    ❌    |
| Hierarquia de roles                       | Hierarchical RBAC     |    ❌    |

Para evoluir para **ABAC**, a `AbilityFactory` pode ser estendida para receber
o usuario completo e o recurso alvo, permitindo regras como "USER pode atualizar
apenas o proprio perfil".
