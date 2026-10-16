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

---

## DEC-014: Storage Abstraction Layer *(Added Part 02)*
- **Decision**: Implement all services with a storage abstraction layer (InMemoryAdapter) that can be swapped for PostgreSQL
- **Rationale**: This is a frontend SPA project without a backend runtime. The abstraction allows services to work immediately for demo/testing while being ready for a real database backend in Part 02b+
- **Date**: 2026-01-28
- **Status**: Active

## DEC-015: Service Module Structure *(Added Part 02)*
- **Decision**: Organize services as TypeScript modules under `src/services/` with clear separation: types, storage, masters, numbering, audit, attachments, workflow, alerts, idempotency, api
- **Rationale**: Each service is independently testable and can be consumed by any module. The index.ts provides a single entry point with initialization.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-016: Append-Only Audit Enforcement *(Added Part 02)*
- **Decision**: Audit records use an append-only storage adapter that blocks update and delete operations
- **Rationale**: Audit integrity is critical for compliance. The adapter enforces this at the storage layer, not just the application layer.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-017: Signed URL Pattern for Attachments *(Added Part 02)*
- **Decision**: Attachments are accessed via short-lived signed URLs (15 min expiry) after permission check on parent record
- **Rationale**: No public buckets. Every download requires authorization. URLs expire to limit exposure.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-018: Separation of Duties in Workflow *(Added Part 02)*
- **Decision**: The submitter of a record can never approve it. Enforced in the workflow engine, not just the UI.
- **Rationale**: Audit compliance requirement. Prevents self-approval fraud.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-019: Idempotency Key Pattern *(Added Part 02)*
- **Decision**: All write APIs accept an idempotency key. Duplicate keys with same payload return cached response. Different payload with same key throws error.
- **Rationale**: Prevents duplicate records from retries, offline sync, and network failures. Critical for financial records.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-020: Alert De-duplication Window *(Added Part 02)*
- **Decision**: Same alert code + entity won't fire again within 1 hour (configurable)
- **Rationale**: Prevents alert fatigue from repeated threshold breaches. Users get one alert per entity per hour.
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-021: Configurable Roles (Not Hard-Coded) *(Added Part 03)*
- **Decision**: Roles are stored in database, not hard-coded in application code
- **Rationale**: Allows companies to customize roles without code changes. Supports multi-tenant deployments with different role structures.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-022: Permission Enforcement at API Level *(Added Part 03)*
- **Decision**: UI hides unauthorized actions, but API is the control
- **Rationale**: Security cannot rely on client-side checks alone. API-level enforcement prevents unauthorized access even if UI is bypassed.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-023: Query-Level Scoping *(Added Part 03)*
- **Decision**: List endpoints filter results based on user scope
- **Rationale**: Prevents data leakage through aggregate queries. Users only see records within their organizational boundary.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-024: Delegation with Date Bounds *(Added Part 03)*
- **Decision**: Delegations have start/end dates, automatically expire
- **Rationale**: Prevents indefinite delegation, reduces security risk. Ensures temporary authority doesn't become permanent.
- **Date**: 2026-01-28
- **Status**: Active

## DEC-025: Maker-Checker via Workflow Engine *(Added Part 03)*
- **Decision**: Reuse Part 02 workflow engine for maker-checker enforcement
- **Rationale**: Single source of truth, no duplicate logic. Workflow engine already enforces submitter ≠ approver.
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-026: Single Asset Register *(Added Part 04)*
- **Decision**: One authoritative register for all assets, linked to fixed-asset records
- **Rationale**: Prevents duplication, ensures consistency between operations and finance
- **Date**: 2026-01-28
- **Status**: Active

## DEC-027: Configurable Categories *(Added Part 04)*
- **Decision**: Asset categories stored in database, not hard-coded
- **Rationale**: Allows companies to add custom categories without code changes
- **Date**: 2026-01-28
- **Status**: Active

## DEC-028: Meter Replacement as Controlled Event *(Added Part 04)*
- **Decision**: Meter replacement requires approval, never appears as negative usage
- **Rationale**: Prevents fraud, maintains accurate usage history
- **Date**: 2026-01-28
- **Status**: Active

## DEC-029: Compliance Document Expiry Alerts *(Added Part 04)*
- **Decision**: Configurable lead times (30/15/7 days) for document expiry alerts
- **Rationale**: Ensures timely renewal, prevents legal/operational issues
- **Date**: 2026-01-28
- **Status**: Active

## DEC-030: Bulk Import with Validation *(Added Part 04)*
- **Decision**: Bulk import validates all rows first, no partial commits on error
- **Rationale**: Prevents data corruption, allows dry-run testing
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-031: Single Allocation Source of Truth *(Added Part 05)*
- **Decision**: Allocation history is the single source for utilization metrics
- **Rationale**: Prevents manual data entry errors, ensures consistency
- **Date**: 2026-01-28
- **Status**: Active

## DEC-032: Transfer with Receipt Confirmation *(Added Part 05)*
- **Decision**: Transfers require receipt confirmation with meter readings and condition check
- **Rationale**: Ensures asset condition is tracked at both ends of transfer
- **Date**: 2026-01-28
- **Status**: Active

## DEC-033: Operator Assignment Validation *(Added Part 05)*
- **Decision**: Comprehensive validation before operator assignment
- **Rationale**: Legal compliance, safety, competency assurance
- **Date**: 2026-01-28
- **Status**: Active

## DEC-034: Override with Audit *(Added Part 05)*
- **Decision**: Validation overrides require reason and approver, fully audited
- **Rationale**: Flexibility with accountability
- **Date**: 2026-01-28
- **Status**: Active

## DEC-035: Document Expiry Alerts *(Added Part 05)*
- **Decision**: Configurable lead times for document expiry alerts
- **Rationale**: Proactive compliance management
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-036: Evidence Rules as Configuration *(Added Part 07)*
- **Decision**: Evidence rules stored in database, not hard-coded
- **Rationale**: Allows customization per asset category without code changes
- **Date**: 2026-01-28
- **Status**: Active

## DEC-037: Submission-Logbook Linkage *(Added Part 07)*
- **Decision**: Approved submissions create/update logbook records
- **Rationale**: Single source of truth, no parallel records
- **Date**: 2026-01-28
- **Status**: Active

## DEC-038: Offline-First Architecture *(Added Part 07)*
- **Decision**: Queue submissions locally, sync when online
- **Rationale**: Supports field operations with poor connectivity
- **Date**: 2026-01-28
- **Status**: Active

## DEC-039: OCR as Reviewer Aid Only *(Added Part 07)*
- **Decision**: OCR results shown beside typed values, never auto-replace
- **Rationale**: Operator input is authoritative, OCR is supplementary
- **Date**: 2026-01-28
- **Status**: Active

## DEC-040: Photo Metadata as Evidence, Not Proof *(Added Part 07)*
- **Decision**: GPS/EXIF metadata stored but labeled as supporting evidence
- **Rationale**: Metadata can be spoofed, not conclusive proof
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-041: Single Inventory Ledger *(Added Part 09)*
- **Decision**: Fuel stock held in existing inventory ledger, not separate fuel ledger
- **Rationale**: Prevents data duplication, ensures consistency with accounting
- **Date**: 2026-01-28
- **Status**: Active

## DEC-042: Calibrated Measuring Points *(Added Part 09)*
- **Decision**: All fuel measurements use calibrated instruments with strapping charts
- **Rationale**: Ensures accuracy for consumption verification and cost allocation
- **Date**: 2026-01-28
- **Status**: Active

## DEC-043: Configurable Tolerances *(Added Part 09)*
- **Decision**: Variance tolerances configurable per operation (receipt, issue, reconciliation)
- **Rationale**: Allows adaptation to different fuel types, equipment, and operational requirements
- **Date**: 2026-01-28
- **Status**: Active

## DEC-044: Automated Daily Reconciliation *(Added Part 09)*
- **Decision**: Daily reconciliation job runs automatically for all storage points
- **Rationale**: Ensures timely detection of variances, reduces manual effort
- **Date**: 2026-01-28
- **Status**: Active

## DEC-045: Mobile-First Issue Interface *(Added Part 09)*
- **Decision**: Fuel issue screen designed for mobile use by attendants
- **Rationale**: Field operations require mobile access, large touch targets for ease of use
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-057: PM Interval Calculation from Approved Readings *(Added Part 11)*
- **Decision**: PM due dates calculated from approved logbook readings only
- **Rationale**: Ensures accuracy and prevents premature or delayed maintenance
- **Date**: 2026-01-28
- **Status**: Active

## DEC-058: Safety-Critical Hold Enforcement *(Added Part 11)*
- **Decision**: Safety-critical defects automatically block asset operations
- **Rationale**: Prevents unsafe equipment operation
- **Date**: 2026-01-28
- **Status**: Active

## DEC-059: Maker-Checker Release *(Added Part 11)*
- **Decision**: Technician cannot release their own work order
- **Rationale**: Ensures independent verification of work quality
- **Date**: 2026-01-28
- **Status**: Active

## DEC-060: Single Inventory Ledger for Parts *(Added Part 11)*
- **Decision**: Parts managed through existing inventory module, not separate ledger
- **Rationale**: Prevents data duplication, ensures consistency
- **Date**: 2026-01-28
- **Status**: Active

## DEC-061: Reliability Metrics with Confidence Levels *(Added Part 11)*
- **Decision**: Metrics show confidence level based on data sufficiency
- **Rationale**: Prevents misleading conclusions from insufficient data
- **Date**: 2026-01-28
- **Status**: Active

## DEC-062: Unexplained Variance Valuation *(Added Part 11)*
- **Decision**: Unexplained maintenance costs retained and valued
- **Rationale**: Ensures financial accountability
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-063: Never Simulate Working Integration *(Added Part 12)*
- **Decision**: All connectors marked `unavailable` unless real credentials configured
- **Rationale**: Prevents false confidence in data quality
- **Date**: 2026-01-28
- **Status**: Active

## DEC-064: Canonical Internal Events *(Added Part 12)*
- **Decision**: Map provider formats to canonical events
- **Rationale**: Modules never depend on vendor formats
- **Date**: 2026-01-28
- **Status**: Active

## DEC-065: Idempotent Event Processing *(Added Part 12)*
- **Decision**: Duplicate webhooks create one record
- **Rationale**: Prevents data duplication from retries
- **Date**: 2026-01-28
- **Status**: Active

## DEC-066: Exponential Back-off Retry *(Added Part 12)*
- **Decision**: Retry with 1min, 5min, 25min back-off
- **Rationale**: Prevents overwhelming failed services
- **Date**: 2026-01-28
- **Status**: Active

## DEC-067: Dead Letter Queue for Failed Events *(Added Part 12)*
- **Decision**: Store failed events for admin replay
- **Rationale**: Allows manual intervention and investigation
- **Date**: 2026-01-28
- **Status**: Active

## DEC-068: Read-Only Plant Integration *(Added Part 12)*
- **Decision**: ERP never writes set-points to plant control systems
- **Rationale**: Safety-critical systems must not be controlled by ERP
- **Date**: 2026-01-28
- **Status**: Active

## DEC-069: Secrets in External Manager *(Added Part 12)*
- **Decision**: Store secrets in AWS Secrets Manager / Azure Key Vault
- **Rationale**: Prevents secrets in code or logs
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-070: Plant Equipment as Assets *(Added Part 13)*
- **Decision**: Plant equipment registered as assets (Part 04) linked to plant
- **Rationale**: Reuse existing asset management, maintenance, and fuel tracking
- **Date**: 2026-01-28
- **Status**: Active

## DEC-071: Manual Entry Requires Approval *(Added Part 13)*
- **Decision**: Manual batch entry requires supervisor approval
- **Rationale**: Ensures data quality when integration unavailable
- **Date**: 2026-01-28
- **Status**: Active

## DEC-072: Source Labels on All Data *(Added Part 13)*
- **Decision**: Every batch carries source label (integrated_live, imported, manual)
- **Rationale**: Transparency about data origin and quality
- **Date**: 2026-01-28
- **Status**: Active

## DEC-073: Configurable Tolerances *(Added Part 13)*
- **Decision**: Weighing tolerances configurable per ingredient type
- **Rationale**: Different materials have different precision requirements
- **Date**: 2026-01-28
- **Status**: Active

## DEC-074: Read-Only Plant Integration *(Added Part 13)*
- **Decision**: Batches imported from PLC/SCADA are read-only
- **Rationale**: Safety-critical systems must not be modified by ERP
- **Date**: 2026-01-28
- **Status**: Active

## DEC-075: KPI Storage by Period *(Added Part 13)*
- **Decision**: KPIs calculated and stored for specific date ranges
- **Rationale**: Enables historical analysis and comparison
- **Date**: 2026-01-28
- **Status**: Active

---

## DEC-086: Record-Linked Conversations *(Added Part 20)*
- **Decision**: Conversations can be linked to ERP records with cached data
- **Rationale**: Enables contextual discussions next to records
- **Date**: 2026-01-28
- **Status**: Active

## DEC-087: Deep Link Protocol *(Added Part 20)*
- **Decision**: Use `erp://record-type/record-id` format for internal links
- **Rationale**: Clear, parseable, and permission-checkable
- **Date**: 2026-01-28
- **Status**: Active

## DEC-088: Alert-to-Chat Integration *(Added Part 20)*
- **Decision**: Alerts can post notifications to chat channels and DMs
- **Rationale**: Centralizes communication and enables quick action
- **Date**: 2026-01-28
- **Status**: Active

## DEC-089: Actionable Messages *(Added Part 20)*
- **Decision**: Chat messages can include action buttons that call backend APIs
- **Rationale**: Reduces context switching and speeds up workflows
- **Date**: 2026-01-28
- **Status**: Active

## DEC-090: Deduplication *(Added Part 20)*
- **Decision**: Chat notifications use deduplication keys to prevent spam
- **Rationale**: Prevents alert fatigue from repeated notifications
- **Date**: 2026-01-28
- **Status**: Active
