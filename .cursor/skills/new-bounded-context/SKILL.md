---
name: new-bounded-context
description: >-
  Scaffold a new bounded context in auth-patterns-ref style (feature folders,
  clean-arch-lite, boundaries). Use when adding a new domain module (e.g. billing).
  Outputs checklist and folder plan only unless user explicitly asks to implement code.
---

# New bounded context

## Default behavior

1. Read [docs/NEW-BOUNDED-CONTEXT-TEMPLATE.md](../../docs/NEW-BOUNDED-CONTEXT-TEMPLATE.md) and [docs/FEATURE-FOLDERS-GUIDELINES.md](../../docs/FEATURE-FOLDERS-GUIDELINES.md).
2. Produce a **checklist + proposed folder tree** for the requested context name.
3. List IAM integration points (audit events, `permissions-api`, `shared` allowlist).
4. Note that `check-domain-boundaries.mjs` must be extended **after** real code under `src/<context>/` exists.

## Non-goals (unless user explicitly asks to implement)

- Do **not** create `src/<context>/` files, controllers, or modules
- Do **not** register imports in `AppModule`
- Do **not** add placeholder domains like `src/billing/` to this reference repo
- Do **not** use `src/module/{domain}` layout from MODULAR-ARCHITECTURE-GUIDELINES

## When implementing (explicit user request)

Follow [docs/coding-patterns.md](../../docs/coding-patterns.md#new-module-checklist), run `npm run verify`, and extend boundary checks. See [reference.md](./reference.md) for a fictional `billing` example.
