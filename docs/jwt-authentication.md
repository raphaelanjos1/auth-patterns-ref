# Autenticacao JWT

## Visao geral

A autenticacao utiliza JSON Web Tokens (JWT) para proteger endpoints da API.
O usuario se autentica uma vez via email/senha e recebe um token que deve ser
enviado em todas as requisicoes subsequentes.

## Fluxo completo

```
                                    API
Usuario                         (NestJS)
  |                                |
  |  POST /auth/sign-in            |
  |  { email, password }           |
  |------------------------------->|
  |                                |--- Busca user pelo email (com passwordHash)
  |                                |--- Verifica password com Argon2
  |                                |--- Gera JWT com { sub, email, role }
  |                                |
  |  200 { accessToken: "eyJ..." } |
  |<-------------------------------|
  |                                |
  |  GET /user (ou qualquer rota   |
  |  protegida)                    |
  |  Authorization: Bearer eyJ...  |
  |------------------------------->|
  |                                |--- AuthGuard extrai token do header
  |                                |--- Verifica assinatura e expiracao
  |                                |--- Injeta payload em request.user
  |                                |
  |  200 { ...dados... }           |
  |<-------------------------------|
```

## Componentes

### 1. Sign-in (`POST /auth/sign-in`)

**Request:**

```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Validacao (ValidationPipe + class-validator):**

| Campo      | Regras                        |
|------------|-------------------------------|
| `email`    | Obrigatorio, formato de email |
| `password` | Obrigatorio, string           |

Se a validacao falhar, retorna `400 Bad Request` com as mensagens de erro
antes de chegar ao service.

**Cenarios de resposta:**

| Cenario            | Status | Resposta                                  |
|--------------------|--------|-------------------------------------------|
| Credenciais validas | 200    | `{ "accessToken": "eyJhbG..." }`         |
| Email nao existe   | 401    | `{ "message": "Invalid credentials" }`    |
| Senha incorreta    | 401    | `{ "message": "Invalid credentials" }`    |
| Body invalido      | 400    | `{ "message": ["email must be an email"] }`|

> A mensagem de erro e identica para email inexistente e senha incorreta.
> Isso e intencional — evita que um atacante descubra quais emails estao
> cadastrados (user enumeration).

### 2. AuthGuard

Guard global aplicado nos controllers que precisam de autenticacao.
Atualmente protege todas as rotas do modulo `user`.

**O que o guard faz:**

1. Extrai o token do header `Authorization: Bearer <token>`
2. Verifica a assinatura e expiracao via `JwtService.verifyAsync()`
3. Se valido, coloca o payload decodificado em `request['user']`
4. Se invalido ou ausente, retorna `401 Unauthorized`

**Como aplicar em um controller:**

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

@UseGuards(AuthGuard)
@Controller('exemplo')
export class ExemploController {
  // todas as rotas deste controller exigem token
}
```

Para proteger apenas uma rota especifica:

```typescript
@UseGuards(AuthGuard)
@Get('rota-protegida')
rotaProtegida() {
  // ...
}
```

### 3. Payload do token

O JWT gerado contem:

```json
{
  "sub": "uuid-do-usuario",
  "email": "usuario@exemplo.com",
  "role": "USER",
  "iat": 1742331560,
  "exp": 1742331860
}
```

| Campo   | Descricao                                     |
|---------|-----------------------------------------------|
| `sub`   | ID do usuario (subject — convencao JWT)       |
| `email` | Email do usuario                              |
| `role`  | Role do usuario (ADMIN, USER, MANAGER)        |
| `iat`   | Timestamp de emissao (issued at)              |
| `exp`   | Timestamp de expiracao (iat + tempo de vida)  |

## Configuracao

**Variaveis de ambiente necessarias (`.env`):**

| Variavel     | Descricao                          |
|--------------|------------------------------------|
| `JWT_SECRET` | Chave secreta para assinar tokens  |

**Tempo de expiracao:**

Configurado em `auth.module.ts` no registro do `JwtModule`:

```typescript
JwtModule.register({
  global: true,
  secret: process.env.JWT_SECRET,
  signOptions: { expiresIn: '5m' }, // alterar aqui
})
```

O `global: true` faz com que o `JwtService` fique disponivel em todos os
modulos sem precisar importar o `JwtModule` novamente.

## Estrutura de arquivos

```
src/auth/
  auth.module.ts        — Modulo com JwtModule, DatabaseModule, HashingModule
  auth.controller.ts    — POST /auth/sign-in
  auth.service.ts       — Logica de validacao e geracao do token
  auth.repository.ts    — Busca de user com passwordHash (para verificacao)
  auth.guard.ts         — Guard que valida o Bearer token
  dto/
    sign-in.dto.ts      — Validacao do body de sign-in
```

## Testando

**1. Criar um usuario:**

```bash
curl -X POST http://localhost:3000/user \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Joao","email":"joao@ex.com","password":"123456","role":"USER"}'
```

> Nota: a rota de criacao de usuario esta protegida pelo AuthGuard.
> Para criar o primeiro usuario, remova temporariamente o `@UseGuards`
> do controller ou crie via seed/prisma studio.

**2. Fazer login:**

```bash
curl -X POST http://localhost:3000/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@ex.com","password":"123456"}'
```

**3. Acessar rota protegida:**

```bash
curl http://localhost:3000/user \
  -H "Authorization: Bearer <token-recebido>"
```
