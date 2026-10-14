# Authentication & authorization

## Authentication

- **Passwords**: hashed with argon2id (`PasswordService`).
- **Access token**: JWT, 15-minute TTL, delivered as an httpOnly cookie
  (`sms_access_token`) and also returned in the body for non-browser clients.
- **Refresh token**: opaque, 30-day TTL, stored hashed (SHA-256) in
  refresh-token families. Rotation is enforced; reuse of a rotated token revokes
  the whole family (session compromise response).
- **MFA**: TOTP via `otplib`; enrolment returns an otpauth secret, confirmation
  returns one-time recovery codes.
- **Flows**: register (creates owner + organization), login, refresh, logout,
  forgot/reset password, verify email.

## Authorization

- **Model**: RBAC. `Role` → `Permission` via `RolePermission`; users are granted
  roles through `UserRole` within a tenant scope (`Membership`).
- **Permissions**: string keys of the form `resource:action` (see
  `backend/src/common/constants/permissions.ts`).
- **Enforcement**: `@RequirePermissions('student:manage')` + `PermissionsGuard`.
  Platform admins bypass permission checks.
- **Principal**: built per request from the database and cached briefly; role or
  membership changes invalidate the cache.

## Tenant isolation

- The active organization is chosen via the `x-organization-id` header and must
  correspond to one of the caller's memberships.
- All queries are scoped by the organisation from the principal; client-supplied
  organisation identifiers are treated as filters within that scope, never as
  authority.
