# Testing Strategy & Quality Assurance

Testing is automated, continuous, and integrated across both frontend and backend packages.

---

## 1. Test Levels & Tooling

| Level | Scope | Framework / Runner | Target Command |
| :--- | :--- | :--- | :--- |
| **Backend Unit Tests** | Domain services, calculations, pagination | Jest + ts-jest | `pnpm --filter @sms/backend test` |
| **Backend E2E Tests** | HTTP API journeys, auth guards, tenant scoping | Jest + Supertest | `pnpm --filter @sms/backend test:e2e` |
| **Frontend Unit / Component** | UI utilities, table formatters, hook state | Vitest + React Testing Library | `pnpm --filter @sms/frontend test` |
| **Frontend E2E** | User journeys, multi-step forms, portal navigation | Playwright | `pnpm --filter @sms/frontend test:e2e` |
| **Performance / Load** | Concurrency, latency (p95/p99), throughput | k6 | `k6 run scripts/load-test.k6.js` |
| **Static Verification** | Type-checking and linting | TypeScript `tsc`, ESLint | `pnpm -r typecheck`, `pnpm -r lint` |

---

## 2. Critical Test Scenarios

### 2.1 Backend Business Logic
- **Financial Minor Units & Allocations**: Verified in `src/modules/finance/finance.service.spec.ts`. Asserts that invoice balances update accurately, collection rates compute without floating-point error, and excess payments are rejected.
- **Grading & Percentage Calculations**: Verified in `src/modules/examinations/examinations.service.spec.ts`. Asserts letter grade boundaries (A >= 90%, B >= 80%, etc.) and pass rate analytics.
- **Pagination Meta**: Verified in `src/common/pagination/pagination.dto.spec.ts`. Asserts correct computation of `totalPages`, `hasNext`, `hasPrevious`, and empty result handling.

### 2.2 Tenant Isolation Regression Testing
- Cross-tenant requests must receive `404 Not Found` or `400 Bad Request` (`INVALID_SCHOOL`).
- Verifies that providing another organization's `schoolId` or `studentId` fails even when authenticating with valid credentials.

---

## 3. Continuous Integration Gates

In `.github/workflows/ci.yml`, every pull request and push to `main` must pass:
1. `pnpm -r typecheck` (strict TypeScript with no implicit any).
2. `pnpm -r lint` (ESLint rules for Next.js and NestJS).
3. `pnpm -r test` (All unit tests across packages).
4. `pnpm -r build` (Production builds for backend and frontend).
