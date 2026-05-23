# Identity & Access Management (IAM)

Reference bounded context for accounts, authentication, authorization, and audit trail. Not the business core of a hypothetical product — it demonstrates IAM patterns in a modular monolith.

## Language

### User Directory

**User**:
An administrable person record in the system: identity, email, role, and stored credential (hash). The aggregate the User Directory creates, updates, and removes.
_Avoid_: Account, principal, member (when the topic is the registry, not the session)

**User Directory**:
Business capability that governs the lifecycle of Users (create, list, search, update, delete) and enforces email uniqueness.
_Avoid_: Identity module, user service (as a domain name)

**Role** (`UserRole`):
Role assigned to a User at registration (e.g. ADMIN, MANAGER, USER). Feeds authorization policies and token claims after sign-in.
_Avoid_: Permission, group, profile (in the RBAC sense)

**Directory record**:
User projection exposed outside the User Directory — never includes the password hash.
_Avoid_: User entity (when conflated with credentials), full user

**Credentials projection**:
Minimal read for sign-in verification: identifier, email, password hash, and role. Belongs to the Authentication subdomain; not exposed on directory APIs.
_Avoid_: User dump, auth user model

### Authentication

**Sign-in**:
Operation where someone proves possession of credentials (email + password) and, if valid, receives an access token.
_Avoid_: Login (acceptable in UI; prefer sign-in in domain language), authenticate (generic verb)

**Access token**:
Short-lived proof of authentication issued after successful sign-in; carries claims of the authenticated principal.
_Avoid_: Session, cookie (this repo uses Bearer JWT)

**Authenticated principal**:
Who is acting on the request *after* sign-in — identified by token claims (sub, email, role), not the full User Directory record.
_Avoid_: User (when the topic is “who is logged in now”), account

**Public route**:
HTTP operation that does not require an access token (e.g. sign-in).
_Avoid_: Anonymous endpoint, open API

### Authorization

**Permission**:
Action + Subject pair a Role may exercise (e.g. READ on USER).
_Avoid_: Standalone capability, grant (without action/subject)

**Action**:
Authorizable operation verb: CREATE, READ, UPDATE, DELETE.
_Avoid_: Verb, operation (generic)

**Subject**:
Resource an Action applies to; today the only business subject is USER.
_Avoid_: Resource, entity (ambiguous with User)

**Ability**:
View derived from a Role: answers whether the principal *can* or *cannot* perform an Action on a Subject.
_Avoid_: Scope, ACL row

**Policy**:
Declarative matrix Role → set of Permissions (policy map).
_Avoid_: Rule engine, RBAC table (as a domain term)

**Access Control**:
Subdomain grouping Authentication + Authorization (identity verification and permission checks).
_Avoid_: Auth (alone — ambiguous), security module

### Audit

**Audit event**:
Immutable fact that something relevant happened in IAM (e.g. USER_CREATED, AUTH_LOGIN), published for asynchronous persistence.
_Avoid_: Log line, trace, metric

**Audit record**:
Persisted audit trail entry derived from an audit event.
_Avoid_: History, changelog

**Actor**:
User (registry record) who performed the action — whoever was authenticated at the time. May be null when no actor is identified.
_Avoid_: userId (technical field), performer (undefined in domain terms)

**Affected entity**:
User or other target the action was performed on (`entityId` on the audit record).
_Avoid_: Target, object id

### Cross-cutting

**IAM**:
Parent domain: User Directory + Access Control + Audit integration. Everything that answers “who exists”, “who is authenticated”, and “what they may do”.
_Avoid_: Identity (as a code folder — deprecated), auth module (as a business name)

**Shared Kernel (User persistence)**:
Shared contract that User Directory and Authentication read/write the same User persistence, with explicit directory ownership of the lifecycle.
_Avoid_: Shared database, common model (without ownership)

## Flagged ambiguities

| Ambiguous term | Resolution |
|----------------|------------|
| **User** | **User (registry)** = record in the User Directory. **Authenticated principal** = claims after sign-in. Never use “user” unqualified in auth vs CRUD discussions. |
| **Auth** | In code: Nest module `auth/`. In domain: prefer **Access Control** (sign-in + permissions) or name the subdomain (Authentication / Authorization). |
| **Identity** | In older docs: `src/identity/` layout is **deprecated**. In domain: prefer **IAM**. |

## Example dialogue

**Dev:** Can a manager update João’s user?

**Domain expert:** It depends. **User** João is the record in the **User Directory**. Who calls the API is the **authenticated principal** — they need **Permission** UPDATE on Subject USER. MANAGER has that permission in the **policy**; a plain USER role does not.

**Dev:** What about when João signs in?

**Domain expert:** That is **Authentication**, not the directory. It issues an **access token** and an **audit event** AUTH_LOGIN: **actor** and **affected entity** are the same User João. The token is not the registry — it only proves the authenticated **principal**.

**Dev:** Admin creates a new account — what do we audit?

**Domain expert:** **Audit event** USER_CREATED. **Actor** = authenticated admin. **Affected entity** = the new **User** created. Metadata describes the registry fields, not the password hash.
