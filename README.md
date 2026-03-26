# Auth Patterns Ref

API de referencia para autenticacao e autorizacao com NestJS. O objetivo deste projeto e servir como base reutilizavel para projetos futuros, documentando padroes e boas praticas de seguranca.

## Arquitetura

Projeto construido com [NestJS](https://nestjs.com/) seguindo arquitetura modular com separacao em camadas:

```
src/
├── auth/           # Autenticacao (JWT, guards, login)
├── user/           # CRUD de usuarios
└── shared/
    ├── database/   # Prisma service
    └── hashing/    # Hashing de senhas (Argon2)
```

**Stack:**
- **Framework:** NestJS 11 + Express
- **Banco de dados:** PostgreSQL 17 + Prisma ORM
- **Autenticacao:** JWT (Bearer token)
- **Hashing:** Argon2id com salt + pepper
- **Seguranca:** Helmet, CORS, Rate Limiting, Validacao de input

## Como rodar o projeto

### Pre-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) e Docker Compose
- npm

### 1. Clonar e instalar dependencias

```bash
git clone <url-do-repositorio>
cd auth-patterns-ref
npm install
```

### 2. Configurar variaveis de ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Preencha as variaveis com os valores desejados:

| Variavel       | Descricao                              | Exemplo                                                          |
| -------------- | -------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL` | String de conexao do PostgreSQL        | `postgresql://postgres:postgres@localhost:5432/auth-patterns-ref` |
| `JWT_SECRET`   | Chave secreta para assinatura do JWT   | (gere uma string aleatoria longa)                                |
| `ARGON2_PEPPER`| Pepper para hashing de senhas          | (gere uma string aleatoria longa)                                |
| `PORT`         | Porta da aplicacao (opcional)          | `3000`                                                           |

### 3. Subir o banco de dados

```bash
docker compose up -d
```

Isso cria um container PostgreSQL 17 acessivel na porta `5432`.

### 4. Executar migrations do Prisma

```bash
npx prisma migrate dev
```

Isso aplica as migrations e gera o Prisma Client.

### 5. Iniciar a aplicacao

```bash
# Desenvolvimento (watch mode)
npm run start:dev

# Producao
npm run build
npm run start:prod
```

A API estara disponivel em `http://localhost:3000`.

## Scripts disponiveis

| Comando              | Descricao                       |
| -------------------- | ------------------------------- |
| `npm run start:dev`  | Inicia em modo desenvolvimento  |
| `npm run start:prod` | Inicia em modo producao         |
| `npm run build`      | Compila o projeto               |
| `npm run test`       | Executa testes unitarios        |
| `npm run test:e2e`   | Executa testes end-to-end       |
| `npm run lint`       | Executa o linter                |

## API Docs (Swagger)

Com a aplicacao rodando, acesse a documentacao interativa em `http://localhost:3000/docs`.

Um arquivo `swagger.json` tambem e gerado automaticamente na raiz do projeto ao iniciar a aplicacao.

## Documentacao

Documentacoes detalhadas estao disponiveis na pasta `docs/`:

- [Autenticacao JWT](docs/jwt-authentication.md)
- [Medidas de Seguranca](docs/security.md)
- [Prisma Migrations](docs/prisma-migrations.md)
- [Autorizacao](docs/authorization.md)
- [Auditoria](docs/audit-log.md)
