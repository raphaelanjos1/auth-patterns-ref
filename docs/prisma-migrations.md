# Prisma Migrations - Usage Guide

## Main commands

| Command | When to use |
|---------|-------------|
| `yarn prisma migrate dev --name description` | Create and apply a migration in dev |
| `yarn prisma migrate reset` | Reset the database and reapply all migrations |
| `yarn prisma generate` | Regenerate the Prisma Client (migrate dev already does this) |
| `yarn prisma migrate deploy` | Apply pending migrations in staging/production |

## Standard flow: changing the schema

1. Edit `prisma/schema.prisma`
2. Run `yarn prisma migrate dev --name description_of_change`
3. Check the generated SQL file in `prisma/migrations/`
4. Commit the schema and migration together

`migrate dev` already runs `generate` automatically, so the Prisma Client
will be up to date after the command.

## Migration naming

Use descriptive names in snake_case:

```bash
yarn prisma migrate dev --name create_user_table
yarn prisma migrate dev --name add_role_to_user
yarn prisma migrate dev --name create_post_and_comment_tables
```

## db push vs migrate dev

| | `db push` | `migrate dev` |
|---|-----------|--------------|
| Creates migration file | No | Yes |
| Traceable history | No | Yes |
| Ideal for | Rapid prototyping | Real development |
| Safe for production | No | Yes (via `migrate deploy`) |

**Do not mix the two.** Using `db push` after having migrations causes drift
(the database falls out of sync with the migration history).

## Resolving common issues

### Drift detected

Happens when the database was changed outside the migration flow (e.g., manual `db push`).

```bash
# In dev, resetting resolves it:
yarn prisma migrate reset
```

### Migration failed to apply

If a migration fails midway:

1. Fix the problem (schema or database)
2. Mark as resolved: `yarn prisma migrate resolve --applied MIGRATION_NAME`
3. Or reset in dev: `yarn prisma migrate reset`

### I need to change an already created migration

- **If not yet committed/shared:** delete the migration folder and run `migrate dev` again
- **If already shared:** create a new migration with the fix

## Production

In production, never use `migrate dev` or `migrate reset`. Only use:

```bash
yarn prisma migrate deploy
```

This command applies pending migrations without interactivity and without resetting data.
