# Prisma Migrations - Guia de Uso

## Comandos principais

| Comando | Quando usar |
|---------|------------|
| `yarn prisma migrate dev --name descricao` | Criar e aplicar uma migration em dev |
| `yarn prisma migrate reset` | Resetar o banco e reaplicar todas as migrations |
| `yarn prisma generate` | Regenerar o Prisma Client (migrate dev ja faz isso) |
| `yarn prisma migrate deploy` | Aplicar migrations pendentes em staging/producao |

## Fluxo padrao: alterar o schema

1. Editar `prisma/schema.prisma`
2. Rodar `yarn prisma migrate dev --name descricao_da_mudanca`
3. Verificar o arquivo SQL gerado em `prisma/migrations/`
4. Commitar o schema e a migration juntos

O `migrate dev` ja roda `generate` automaticamente, entao o Prisma Client
estara atualizado apos o comando.

## Nomeacao de migrations

Usar nomes descritivos em snake_case:

```bash
yarn prisma migrate dev --name create_user_table
yarn prisma migrate dev --name add_role_to_user
yarn prisma migrate dev --name create_post_and_comment_tables
```

## db push vs migrate dev

| | `db push` | `migrate dev` |
|---|-----------|--------------|
| Cria arquivo de migration | Nao | Sim |
| Historico rastreavel | Nao | Sim |
| Ideal para | Prototipacao rapida | Desenvolvimento real |
| Seguro para producao | Nao | Sim (via `migrate deploy`) |

**Nao misture os dois.** Usar `db push` depois de ter migrations causa drift
(o banco fica fora de sincronia com o historico de migrations).

## Resolvendo problemas comuns

### Drift detected

Acontece quando o banco foi alterado fora do fluxo de migrations (ex: `db push` manual).

```bash
# Em dev, resetar resolve:
yarn prisma migrate reset
```

### Migration failed to apply

Se uma migration falhar no meio:

1. Corrigir o problema (schema ou banco)
2. Marcar como resolvida: `yarn prisma migrate resolve --applied NOME_DA_MIGRATION`
3. Ou resetar em dev: `yarn prisma migrate reset`

### Preciso alterar uma migration ja criada

- **Se ainda nao foi commitada/compartilhada:** delete a pasta da migration e rode `migrate dev` novamente
- **Se ja foi compartilhada:** crie uma nova migration com a correcao

## Producao

Em producao, nunca use `migrate dev` ou `migrate reset`. Use apenas:

```bash
yarn prisma migrate deploy
```

Este comando aplica migrations pendentes sem interatividade e sem resetar dados.
