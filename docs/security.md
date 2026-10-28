# Application Security & OWASP ASVS Compliance

The School Management System is designed and engineered according to the **OWASP Application Security Verification Standard (ASVS)** and OWASP Top 10 guidelines.

---

## 1. Authentication & Password Security

- **Argon2id Hashing**: Passwords are hashed using the Argon2id algorithm (memory cost: 65,536 KiB, iterations: 3, parallelism: 4), which is memory-hard and resilient against GPU and ASIC brute-force attacks.
- **Short-Lived JWT Access Tokens**: 15-minute expiration time reduces the window of exposure if a token is intercepted.
- **Rotating Refresh Tokens**: 7-day expiration with single-use rotation. Token reuse detection automatically revokes all family tokens upon detection of concurrent or replayed tokens.
- **Multi-Factor Authentication (MFA)**: Built-in TOTP support (RFC 6238) compatible with Google Authenticator, Authy, and hardware tokens, accompanied by hashed one-time emergency recovery codes.
- **Brute Force Protection**: NestJS Throttler guards endpoints at the application layer, paired with Nginx request limit zones at the reverse proxy layer.

---

## 2. Authorization & RBAC

- **Principle of Least Privilege**: Users are assigned roles composed of explicit `resource:action` permissions (e.g. `student:read`, `payment:manage`, `grade:publish`).
- **Global Permissions Guard**: Enforced on every controller route. Missing permissions yield `403 Forbidden` errors before business logic executes.
- **Audit Logging**: The `@Audit(action, resource)` interceptor logs all state-mutating requests, recording actor ID, tenant ID, IP address, and request payload metadata to PostgreSQL.

---

## 3. Data Protection & Sensitive Data Redaction

- **Structured Logging Redaction**: Pino HTTP logger automatically censors sensitive headers and body fields (`req.body.password`, `req.body.mfaCode`, `req.headers.authorization`, `req.headers.cookie`, `res.headers["set-cookie"]`).
- **Input Validation & Sanitization**: Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` prevents mass assignment vulnerabilities.
- **Safe Database Queries**: Prisma ORM executes parameterized queries under the hood, completely preventing SQL injection vulnerabilities.
- **Secure Cookies**: When used, session cookies are configured with `HttpOnly; Secure; SameSite=Lax`.

---

## 4. File Storage Security

- **Storage Abstraction**: Sensitive files (medical records, disciplinary files, identity documents) are stored in private object storage.
- **Expiring HMAC Signed URLs**: Access to private documents requires a short-lived (5-minute) cryptographic HMAC signature. Public direct file listing is disallowed.
- **MIME Type Validation**: Uploaded files undergo MIME type and size checks before persisting to storage.
