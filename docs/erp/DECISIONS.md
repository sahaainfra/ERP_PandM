# ConstructERP — Decision Log

## DEC-001: Frontend-First Implementation
- **Decision**: Implement full frontend with realistic mock data before backend
- **Rationale**: Allows UI/UX validation, workflow testing, and stakeholder review
- **Date**: 2026-01-28
- **Status**: Active

## DEC-002: Indian Locale Defaults
- **Decision**: Default timezone Asia/Kolkata, currency INR with Indian digit grouping
- **Rationale**: All operations are in India; statutory compliance requires Indian formatting
- **Date**: 2026-01-28
- **Status**: Active

## DEC-003: Status Workflow Enforcement
- **Decision**: All operational records follow draft → submitted → pending_approval → approved/rejected
- **Rationale**: Maker-checker controls required for audit compliance
- **Date**: 2026-01-28
- **Status**: Active

## DEC-004: Factual Language in Exceptions
- **Decision**: System describes deviations factually, never labels persons
- **Rationale**: Legal protection, professional standards, Indian labour law compliance
- **Example**: "Unexplained variance of 18 L" not "Possible fuel theft by operator"
- **Date**: 2026-01-28
- **Status**: Active

## DEC-005: Integration Transparency
- **Decision**: Mark unavailable integrations clearly; never simulate success
- **Rationale**: Principle 10 from Part 00; prevents false confidence in data
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-006: PostgreSQL as Primary Database *(Added Part 01)*
- **Decision**: Use PostgreSQL 15+ as the primary relational database
- **Rationale**: ACID compliance for financial records, JSONB for flexible operational data, mature ecosystem, excellent TypeScript tooling (Drizzle/Prisma), strong GIS support for future GPS integration, proven at scale in Indian enterprise deployments
- **Alternatives considered**: MySQL (weaker JSON support), MongoDB (no ACID for finance), Supabase-only (vendor lock-in risk for core ERP data)
- **Date**: 2026-01-28
- **Status**: Proposed (to be confirmed in Part 02)

## DEC-007: Vitest + Testing Library for Testing *(Added Part 01)*
- **Decision**: Use Vitest for unit/integration tests and @testing-library/react for component tests
- **Rationale**: Native Vite integration (no config overhead), fast execution, compatible with existing TypeScript setup, community standard for React testing
- **Alternatives considered**: Jest (slower, requires Babel config), Cypress (E2E only, not unit)
- **Date**: 2026-01-28
- **Status**: Proposed (to be confirmed in Part 02)

## DEC-008: ESLint flat config + Prettier *(Added Part 01)*
- **Decision**: Use ESLint 9+ flat config with TypeScript-ESLint and Prettier for formatting
- **Rationale**: Modern config format, consistent code style, catches common bugs
- **Date**: 2026-01-28
- **Status**: Proposed (to be confirmed in Part 02)

## DEC-009: Remove Misleading Encryption Claim Immediately *(Added Part 01)*
- **Decision**: Remove "🔒 End-to-end encrypted" text from TeamChat.tsx
- **Rationale**: Legal risk — no encryption is implemented. Claiming E2E encryption when none exists could create liability under Indian IT Act 2000 and consumer protection law.
- **Risk**: R-005
- **Date**: 2026-01-28
- **Status**: **Approved — Must fix before Part 02**

## DEC-010: Code Splitting Before Part 03 *(Added Part 01)*
- **Decision**: Implement route-based code splitting with React.lazy() before adding more modules
- **Rationale**: Current bundle is 679 kB (exceeds 500 kB warning). Mobile users on 3G/4G at construction sites need fast load times.
- **Risk**: R-004
- **Date**: 2026-01-28
- **Status**: Proposed (to be implemented in Part 02)

## DEC-011: Drizzle ORM for Database Access *(Added Part 01)*
- **Decision**: Use Drizzle ORM for type-safe database access
- **Rationale**: TypeScript-first, lightweight, excellent migration support, SQL-like syntax, works with PostgreSQL, no runtime overhead
- **Alternatives considered**: Prisma (heavier, generates client code), Knex (no type safety), TypeORM (decorator-heavy, complex)
- **Date**: 2026-01-28
- **Status**: Proposed (to be confirmed in Part 02)

## DEC-012: Express.js for REST API *(Added Part 01)*
- **Decision**: Use Express.js as the HTTP framework for the REST API
- **Rationale**: Most widely used Node.js framework, massive middleware ecosystem, team familiarity, simple to learn
- **Alternatives considered**: Fastify (faster but smaller ecosystem), Hono (newer, less proven), NestJS (overkill for initial implementation)
- **Date**: 2026-01-28
- **Status**: Proposed (to be confirmed in Part 02)

## DEC-013: GitHub Actions for CI/CD *(Added Part 01)*
- **Decision**: Use GitHub Actions for continuous integration and deployment
- **Rationale**: Native GitHub integration, free for public repos, supports all required tools (Node.js, PostgreSQL, Docker)
- **Date**: 2026-01-28
- **Status**: Proposed (to be confirmed in Part 02)
