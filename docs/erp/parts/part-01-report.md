# Part 01 — Repository Assessment, Gap Analysis & Roadmap Report

## 1. Stack Inventory (Summary)

| Category | Current State |
|----------|--------------|
| **Language** | TypeScript 5.7, strict mode |
| **Frontend** | React 18.2, Vite 6.3, Tailwind 4.1 |
| **Backend** | ❌ None |
| **Database** | ❌ None (mock data in TypeScript arrays) |
| **Cache** | ❌ None |
| **Queue** | ❌ None |
| **File Storage** | ❌ None |
| **Search** | ❌ None |
| **Auth** | ❌ None |
| **Testing** | ❌ None (no runner, no tests) |
| **Linting** | ❌ None |
| **CI/CD** | ❌ None |
| **PWA/Offline** | ❌ None |
| **Package Manager** | npm |
| **Hosting** | Static `dist/` output, no deployment configured |

**Notable finding**: `@supabase/supabase-js@2.98.0` is installed in `package.json` but **not imported or used anywhere in source code**. It adds to bundle size without providing value.

---

## 2. Module Map

### Existing Modules (7 frontend pages)

| Module | Route | Types Used | Data Source | Persistence |
|--------|-------|-----------|-------------|-------------|
| Dashboard | `/` | DashboardKPI | `mockData.ts` | ❌ None |
| Fleet & Equipment | `/fleet` | Equipment, OperatorLog | `mockData.ts` | ❌ None |
| Fuel Management | `/fuel` | FuelRecord | `mockData.ts` | ❌ None |
| RMC Operations | `/rmc` | RMCOrder, MixDesign | `mockData.ts` | ❌ None |
| Team Chat | `/chat` | ChatChannel, ChatMessage | `mockData.ts` | ❌ None |
| Finance & Costing | `/finance` | FinanceEntry | `mockData.ts` | ❌ None |
| Alerts | `/alerts` | Alert | `mockData.ts` | ❌ None |

### Missing Modules (Required by ERP scope)

- Projects / Sites management
- Accounting (chart of accounts, ledger, trial balance)
- Inventory / Store management
- Procurement / Purchase Orders / GRN
- HR / Payroll / Employee master
- Document management (upload, version, approval)
- Notification service (email, SMS, push)
- Vendor master
- Customer master
- Numbering series service
- Audit logging service
- Alert rule engine

---

## 3. Shared Masters Assessment

| Master | Status | Evidence |
|--------|--------|----------|
| Company | ❌ Missing | Not found after search of `src/`. No company entity. |
| Project | ⚠️ String only | `Equipment.project` is a string (`src/types/index.ts:12`). No project master table. |
| Site | ❌ Missing | Not found after search of `src/`. `RMCOrder.siteName` is a string. |
| Plant | ❌ Missing | Not found after search of `src/`. `RMCOrder.plant` is a string. |
| Department | ❌ Missing | Not found after search of `src/`. |
| Cost Centre | ❌ Missing | Not found after search of `src/`. |
| User / Employee | ❌ Missing | Not found after search of `src/`. No user table. |
| Vendor | ❌ Missing | Not found after search of `src/`. |
| Customer | ❌ Missing | Not found after search of `src/`. |
| Item / Material | ❌ Missing | Not found after search of `src/`. |
| Unit of Measure | ❌ Missing | Not found after search of `src/`. Units are implicit in comments. |
| Warehouse / Store | ❌ Missing | Not found after search of `src/`. |
| Tax Codes | ❌ Missing | Not found after search of `src/`. |
| Chart of Accounts | ❌ Missing | Not found after search of `src/`. `FinanceEntry.account` is free text. |

**Conclusion**: Every master is either missing or reduced to a string field. Part 02 must establish the canonical master tables.

---

## 4. Security Model Assessment

| Aspect | Status | Evidence |
|--------|--------|----------|
| Authentication | ❌ Missing | Not found after search of `src/`. Profile dropdown in `Layout.tsx:82-100` is purely decorative. |
| Password policy | ❌ Missing | Not found after search of `src/`. |
| MFA | ❌ Missing | Not found after search of `src/`. |
| Role model | ❌ Missing | Not found after search of `src/`. No role definitions. |
| Permission checks | ❌ Missing | Not found after search of `src/`. No middleware, no guards. |
| Record-level scoping | ❌ Missing | Not found after search of `src/`. |
| Audit logging | ❌ Missing | Not found after search of `src/`. No audit trail. |
| Secrets handling | ❌ Missing | Not found after search of `src/`. No `.env` files, no secrets manager. |
| CORS | ❌ Missing | Not found after search of `vite.config.js`. |
| Rate limiting | ❌ Missing | Not applicable (no API yet). |

---

## 5. Integrations Assessment

| Integration | Status | Evidence |
|-------------|--------|----------|
| Email | ❌ Absent | Not found after search of `src/`. |
| SMS | ❌ Absent | Not found after search of `src/`. |
| Push notifications | ❌ Absent | Not found after search of `src/`. No service worker. |
| GPS / Telematics | ⚠️ Placeholder | `RMCOperations.tsx` dispatch tab shows "GPS Integration: Awaiting device configuration". |
| Weighbridge | ❌ Absent | Not found after search of `src/`. |
| PLC / SCADA | ❌ Absent | Not found after search of `src/`. |
| Payment gateway | ❌ Absent | Not found after search of `src/`. |
| GST e-invoice | ❌ Absent | Not found after search of `src/`. |
| GST e-way bill | ❌ Absent | Not found after search of `src/`. |
| Maps | ❌ Absent | Not found after search of `src/`. |

---

## 6. Quality Baseline

### Test Suite

| Command | Result | Notes |
|---------|--------|-------|
| `npm run build` | ✅ PASS (9.65s) | Vite production build succeeds |
| `npm run typecheck` | ✅ PASS | TypeScript strict mode, no errors |
| `npm test` | ❌ Not configured | No `test` script in `package.json` |
| Linting | ❌ Not configured | No ESLint config file |
| Coverage | ❌ Not measurable | No test runner installed |

### Build Output Analysis
```
dist/index.html                   0.82 kB │ gzip:  0.47 kB
dist/assets/index-DVr6Uelk.css   26.25 kB │ gzip:  5.81 kB
dist/assets/index-C5FBJ7uu.js   679.12 kB │ gzip: 185.81 kB
```

⚠️ **Warning**: Single JS chunk (679 kB) exceeds the 500 kB threshold. This will cause slow load times on mobile networks at construction sites.

### Failing Tests
- N/A — No test suite exists.

---

## 7. Data Volume Baseline

| Table/Collection | Row Count | Notes |
|-----------------|-----------|-------|
| Equipment | 8 | Mock data in `mockData.ts` |
| Operator Logs | 5 | Mock data |
| Fuel Records | 5 | Mock data |
| RMC Orders | 4 | Mock data |
| Mix Designs | 4 | Mock data |
| Chat Channels | 5 | Mock data |
| Chat Messages | 7 | Mock data |
| Alerts | 6 | Mock data |
| Finance Entries | 5 | Mock data |
| **Total** | **49** | All in-memory, no database |

### Slow Queries / Missing Indexes
- N/A — No database exists.

---

## 8. Gap Analysis (Summary)

Full gap analysis with file-path citations is in [`docs/erp/GAP_ANALYSIS.md`](../GAP_ANALYSIS.md).

### Classification Summary

| Area | Exists & Reusable | Exists, Needs Extension | Missing |
|------|:-:|:-:|:-:|
| Fleet Assets | — | 2 | 2 |
| Operators & Logbook | — | 2 | 2 |
| Fuel Management | 2 | 1 | 2 |
| Maintenance | — | 1 | 3 |
| RMC Operations | 1 | 2 | 4 |
| Team Chat | 3 | — | 5 |
| Finance | — | 2 | 3 |
| Dashboards | 1 | — | 3 |
| Alerts | 1 | — | 3 |
| Cross-Cutting | — | 1 | 11 |

**Total**: 8 reusable, 11 need extension, 38 missing.

---

## 9. Risk Register (Summary)

Full risk register is in [`docs/erp/RISKS.md`](../RISKS.md).

### Critical Risks (Must resolve before Part 03)

| ID | Risk | Impact |
|----|------|--------|
| R-001 | No data persistence | Critical |
| R-002 | No authentication | Critical |
| R-003 | No backend API | Critical |
| R-006 | No test suite | High |
| R-005 | Misleading encryption claim | High |

---

## 10. Roadmap (Parts 02–25)

Full roadmap with dependencies is in [`docs/erp/PROGRESS.md`](../PROGRESS.md).

### Confirmed Sequence

| Part | Title | Depends On | Reuses | Key Deliverables |
|------|-------|-----------|--------|-----------------|
| **02** | Backend Foundation | 01 | — | PostgreSQL, Express API, Auth (JWT), Vitest, ESLint, DB migrations, audit service |
| **03** | Fleet Assets CRUD | 02 | Auth, Audit | Equipment master, allocation, maintenance scheduling |
| **04** | Operator Logbook | 02, 03 | Auth, Audit, Fleet | Log submission, photo upload, approval workflow |
| **05** | Fuel Management | 02, 03, 04 | Auth, Audit, Fleet, Logs | Fuel issue, expected consumption calc, variance alerts |
| **06** | Maintenance & Workshop | 02, 03 | Auth, Audit, Fleet | Work orders, spare parts, cost tracking |
| **07** | RMC Mix Designs | 02 | Auth, Audit | Mix design CRUD, trial cubes, approval |
| **08** | RMC Orders & Batches | 02, 07 | Auth, Audit, Mix Designs | Order management, batch tickets, material deduction |
| **09** | RMC Quality (QA/QC) | 02, 08 | Auth, Audit, Batches | Slump tests, cube tests, NDT, certificates |
| **10** | RMC Dispatch & Tracking | 02, 08 | Auth, Audit, Orders | Transit mixer dispatch, GPS placeholder, delivery confirmation |
| **11** | Team Chat Backend | 02 | Auth | Message persistence, file sharing, read receipts |
| **12** | Finance: Chart & Vouchers | 02 | Auth, Audit | Chart of accounts, journal entries, posting workflow |
| **13** | Finance: Project Costing | 02, 12 | Auth, Audit, Finance | Cost centres, budget vs actual, project P&L |
| **14** | Finance: GST & E-Invoice | 02, 12 | Auth, Audit, Finance | GST calculation, e-invoice, e-way bill |
| **15** | Dashboards & Reports | 02, 03–14 | All modules | Configurable KPIs, PDF/Excel export, scheduled reports |
| **16** | Alert Rule Engine | 02, 05, 15 | Auth, All modules | Threshold rules, auto-generation, email/SMS delivery |
| **17** | Inventory & Procurement | 02 | Auth, Audit | Material master, stock, PO, GRN, vendor |
| **18** | HR & Payroll | 02 | Auth, Audit | Employee master, attendance, payroll, compliance |
| **19** | Document Management | 02 | Auth, Audit | Upload, versioning, approval, OCR |
| **20** | External Integrations | 02, 03–10 | All modules | GPS, fuel IoT, weighbridge, PLC |
| **21** | Offline / PWA | 02, 11 | Auth, Chat | Service worker, IndexedDB, sync queue |
| **22** | Security Hardening | 02, all | All | Pen testing, OWASP compliance, secrets rotation |
| **23** | Performance | 02, all | All | Caching (Redis), query optimization, CDN |
| **24** | Deployment & CI/CD | 02, all | All | Docker, GitHub Actions, monitoring, backups |
| **25** | UAT & Go-Live | all | All | User training, data migration, cutover |

### Parts That May Need Splitting

| Part | Reason | Potential Split |
|------|--------|-----------------|
| 02 | Very large scope (DB + API + Auth + Tests + CI) | 02a: DB + Migrations, 02b: API + Auth + Tests |
| 14 | GST + e-invoice + e-way bill is complex | 14a: GST calculation, 14b: E-invoice/e-way bill |
| 20 | Multiple integrations, each complex | 20a: GPS, 20b: Fuel IoT, 20c: Weighbridge/PLC |

### New ADRs Recorded

- **DEC-006**: PostgreSQL as primary database
- **DEC-007**: Vitest + Testing Library for testing
- **DEC-008**: ESLint flat config + Prettier
- **DEC-009**: Remove misleading encryption claim (MUST FIX)
- **DEC-010**: Code splitting before Part 03
- **DEC-011**: Drizzle ORM for database access
- **DEC-012**: Express.js for REST API
- **DEC-013**: GitHub Actions for CI/CD

---

## 11. Files Created/Modified

| File | Action |
|------|--------|
| `docs/erp/ARCHITECTURE.md` | **Rewritten** — Full stack inventory, module map, Mermaid diagram |
| `docs/erp/PROGRESS.md` | **Rewritten** — 25-part table with phases and dependencies |
| `docs/erp/DECISIONS.md` | **Extended** — Added DEC-006 through DEC-013 |
| `docs/erp/GAP_ANALYSIS.md` | **Created** — 50+ gap items with file-path evidence |
| `docs/erp/RISKS.md` | **Created** — 15 risks with likelihood, impact, mitigation |
| `docs/erp/ASSUMPTIONS.md` | **Created** — 25+ assumptions across infrastructure, business, integrations |
| `docs/erp/PERMISSIONS.md` | **Created** — Empty template for Part 02 |
| `docs/erp/KPI_DEFINITIONS.md` | **Created** — Empty template for Parts 03+ |
| `docs/erp/parts/part-01-report.md` | **Created** — This file |

---

## 12. Acceptance Test Verification

| Test | Status | Evidence |
|------|--------|----------|
| Every gap-analysis line cites a file path or states "not found after search of X" | ✅ | `docs/erp/GAP_ANALYSIS.md` — every row has Evidence column |
| Test-suite baseline recorded with exact command and results | ✅ | Section 6 above: `npm run build` ✅, `npm run typecheck` ✅, `npm test` ❌ not configured |
| No production code changed except test-harness fixes | ✅ | This part is documentation-only. No files in `src/` were modified. |
| `PROGRESS.md` lists Parts 00–25 | ✅ | 25 rows in the status table |
| Part 01 marked complete only if all tasks done | ✅ | All 10 tasks completed (see sections above) |

---

## 13. Immediate Actions Required Before Part 02

1. **DEC-009**: Remove "🔒 End-to-end encrypted" text from `src/pages/TeamChat.tsx:168` — replace with "Demo mode — encryption not yet implemented"
2. **DEC-010**: Implement route-based code splitting in `src/App.tsx` using `React.lazy()` + `Suspense`
3. **DEC-008**: Add ESLint + Prettier configuration
4. **DEC-007**: Install Vitest + @testing-library/react and create first smoke test

---

## 14. Next Step

**Part 02 — Backend Foundation**: Set up PostgreSQL, Express.js REST API, Drizzle ORM, JWT authentication, Vitest test suite, ESLint, GitHub Actions CI, audit logging service, and database migrations for all master tables identified in the gap analysis.
