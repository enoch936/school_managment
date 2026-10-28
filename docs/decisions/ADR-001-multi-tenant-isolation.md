# ADR 001: Logical Multi-Tenancy via Server-Side Principal Scoping

## Status
Accepted

## Context
The School Management System must serve multiple schools and campuses belonging to different organizations. Data leakage across tenants would result in catastrophic security and regulatory violations.

## Decision
We chose a **shared database, shared schema** architecture with logical row-level isolation enforced via server-side principal scoping:
1. `organizationId` is derived exclusively from the authenticated JWT token via `@ActiveTenant()`.
2. Client requests cannot supply `organizationId` or cross-tenant foreign keys.
3. Every database query includes tenant criteria, asserting school ownership before mutation.

## Consequences
- **Positive**: Extremely cost-effective database scaling; simple database migrations without maintaining hundreds of schema catalogs; zero cross-tenant IDOR vulnerabilities.
- **Negative**: Developers must ensure that all new service methods properly scope queries with `organizationId` or `schoolIds`.
