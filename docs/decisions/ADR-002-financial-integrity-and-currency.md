# ADR 002: Integer Minor Units for Financial Precision & ETB Currency

## Status
Accepted

## Context
Educational institutions bill for tuition, transport, uniforms, and books. Storing currency as standard floating-point numbers (`FLOAT` or `DOUBLE`) in PostgreSQL leads to cumulative IEEE 754 rounding errors. Furthermore, the primary operating market requires Ethiopian Birr (ETB) support with options for mobile money (Telebirr/Chapa) and bank transfers.

## Decision
1. All monetary values are modeled in **integer minor units** (e.g., 100 ETB = 10,000 cents/minor units).
2. Field naming convention explicitly reflects minor units: `totalMinor`, `balanceMinor`, `paidMinor`, `amountMinor`.
3. Payment allocations and invoice balance updates are wrapped in atomic database transactions (`prisma.$transaction`).
4. Primary currency defaults to `ETB` with ISO-4217 currency codes stored alongside each record.

## Consequences
- **Positive**: Exact financial reconciliation down to the cent; zero rounding drift; robust auditability.
- **Negative**: Frontend and API layers must convert between minor and major units for human display.
