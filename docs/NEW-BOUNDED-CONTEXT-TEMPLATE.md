# New bounded context — template

Use when adding a **new** top-level module under `src/` (e.g. `billing`), aligned with [FEATURE-FOLDERS-GUIDELINES.md](./FEATURE-FOLDERS-GUIDELINES.md) and [coding-patterns.md](./coding-patterns.md#new-module-checklist).

**This document is a checklist only.** It does not create folders in the repo unless you explicitly implement code.

---

## 1. Naming and placement

- [ ] Ubiquitous language name for the context (e.g. `billing`, not `payment-module`)
- [ ] Top-level folder: `src/<context>/`
- [ ] One NestJS module: `src/<context>/<context>.module.ts`
- [ ] Register in `AppModule` only when implementing (not during planning-only requests)

---

## 2. Folder tree (placeholder)

```
src/<context>/
├── <feature-a>/              # feature folder (if 2+ capabilities)
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   └── <feature>.repository.ts   # or port + adapter
├── <context>.module.ts
└── dto/                      # optional, at context root
```

If the context has a **single** capability, a flat `application/` + `domain/ports/` layout (like `user`) is acceptable — see [FEATURE-FOLDERS-GUIDELINES.md](./FEATURE-FOLDERS-GUIDELINES.md).

---

## 3. IAM cross-cutting rules

| Concern | Rule |
|---------|------|
| Audit | Publish via `src/audit-log/events/` only — never import `AuditLogService` |
| RBAC on HTTP | Import `Action`, `Subject`, `CheckPermissions` from `src/permissions-api/` |
| DB / hash / JWT types | `src/shared/database`, `hashing`, `contracts` only |
| IAM modules | Do not import `src/auth/**` or `src/user/**` except documented ports/facades |

---

## 4. Boundaries script (after code exists)

When `src/<context>/` is added, extend [scripts/check-domain-boundaries.mjs](../scripts/check-domain-boundaries.mjs):

- Add `src/<context>` to scan roots or document allowlists (which modules it may import).
- Add `--self-test` fixture if new forbidden patterns apply.
- Run `npm run check:boundaries` and `node scripts/check-domain-boundaries.mjs --self-test`.

Until implementation exists, **do not** change the script — only note the step in your plan.

---

## 5. Verification

```bash
npm run verify
npm run build
```

---

## Non-goals (reference repo)

- Do not create example domains (`src/billing/`) in planning-only tasks
- Do not use legacy `src/module/<domain>/` layout ([MODULAR-ARCHITECTURE-GUIDELINES.md](./MODULAR-ARCHITECTURE-GUIDELINES.md) banner)
- Do not add nested Nest feature modules unless ADR-approved

---

## Agent skill

Cursor skill: `.cursor/skills/new-bounded-context/SKILL.md` — outputs this checklist and a folder plan by default.
