# ConstructERP — Gap Analysis

Each line cites the file path examined as evidence. "Not found after search of X" means the feature was searched for across those paths and does not exist.

## Fleet Assets

| Area | Classification | Evidence |
|------|---------------|----------|
| Equipment master (type, registration, capacity) | ✅ Exists, needs extension | `src/types/index.ts:5-19` defines Equipment interface; `src/data/mockData.ts:3-12` has 8 records. Missing: purchase date, depreciation schedule, insurance, PUC, fitness certificate, GPS device ID. |
| Equipment CRUD (create/edit/delete) | ❌ Missing | Not found after search of `src/pages/FleetManagement.tsx`. UI shows cards but has no form to create or edit equipment. |
| Equipment status lifecycle | ⚠️ Exists but needs extension | `src/types/index.ts:11` has 4 statuses (operational, maintenance, idle, decommissioned). Missing: transition rules, who can change status, required evidence. |
| Equipment-to-project allocation | ❌ Missing | Not found after search of `src/`. Equipment has a `project` string field but no allocation history, transfer log, or utilization tracking. |

## Operators & Logbook

| Area | Classification | Evidence |
|------|---------------|----------|
| Operator master | ❌ Missing | Not found after search of `src/`. Operator is a string on Equipment (`src/types/index.ts:13`) and OperatorLog (`src/types/index.ts:26`). No employee/operator master table. |
| Daily operator log (opening/closing readings, hours, work description) | ✅ Exists, needs extension | `src/types/index.ts:21-42` defines OperatorLog; `src/pages/FleetManagement.tsx` displays logs in detail panel. Missing: form to submit, photo upload, GPS coordinates, attachment storage. |
| Photo evidence capture | ❌ Missing | Not found after search of `src/`. `OperatorLog.photos` is `string[]` (line 41) but no upload UI, no storage, no camera integration. |
| Senior approval workflow | ⚠️ Exists but needs extension | Status field supports `pending_approval` → `approved`/`rejected` (`src/types/index.ts:1`). Mock data shows approval metadata (`src/data/mockData.ts:15-16`). Missing: actual approval UI, rejection reason form, approval chain, delegation rules. |

## Fuel Management

| Area | Classification | Evidence |
|------|---------------|----------|
| Fuel issue record | ✅ Exists, needs extension | `src/types/index.ts:44-58` defines FuelRecord; `src/pages/FuelManagement.tsx` displays table. Missing: form to record fuel issue, fuel pump/dispenser integration, receipt photo. |
| Expected consumption calculation | ✅ Exists (static) | `src/data/mockData.ts:51` has `expectedConsumption` pre-calculated. Missing: server-side calculation based on running hours × rated consumption, calibration factors, terrain/load adjustments. |
| Variance detection & threshold | ✅ Exists (frontend only) | `src/pages/FuelManagement.tsx:30-35` calculates totalVariance and shows threshold warning at 5%. Missing: configurable thresholds per equipment type, automatic alert generation. |
| Daily verification workflow | ❌ Missing | Not found after search of `src/`. No verification step where fuel officer confirms readings against physical dip-stick or meter. |
| Fuel meter / IoT integration | ❌ Missing | Not found after search of `src/`. `dataSource` field exists but no integration code. Marked unavailable per `docs/erp/ARCHITECTURE.md:57`. |

## Maintenance & Workshop

| Area | Classification | Evidence |
|------|---------------|----------|
| Maintenance scheduling | ⚠️ Exists but needs extension | Equipment has `lastMaintenance` and `nextMaintenance` date strings (`src/types/index.ts:17-18`). Missing: maintenance plan, PM schedule, work order system, spare parts consumption. |
| Maintenance history | ❌ Missing | Not found after search of `src/`. No maintenance log table, no work order, no cost tracking per maintenance event. |
| Spare parts inventory | ❌ Missing | Not found after search of `src/`. No inventory module, no stock levels, no reorder points. |
| Workshop job card | ❌ Missing | Not found after search of `src/`. |

## RMC Plant Operations

| Area | Classification | Evidence |
|------|---------------|----------|
| Mix design master | ✅ Exists, needs extension | `src/types/index.ts:77-91` defines MixDesign with proportions; `src/data/mockData.ts:50-55` has 4 designs. Missing: trial cube results, revision history, approval workflow. |
| RMC order management | ✅ Exists, needs extension | `src/types/index.ts:60-75` defines RMCOrder; `src/pages/RMCOperations.tsx` has full table with status badges. Missing: order creation form, delivery scheduling, partial delivery tracking. |
| Batch ticket / production record | ❌ Missing | Not found after search of `src/`. No batch record with actual proportions, moisture correction, yield calculation. |
| Quality testing (slump, cube) | ❌ Missing | Not found after search of `src/`. Slump mentioned in special instructions text but no QA/QC module. |
| Transit mixer dispatch & tracking | ❌ Missing | Not found after search of `src/`. `RMCOperations.tsx` dispatch tab shows placeholder: "GPS Integration: Awaiting device configuration". |
| Weighbridge integration | ❌ Missing | Not found after search of `src/`. |
| Plant material consumption | ❌ Missing | Not found after search of `src/`. No linkage between batch production and inventory deduction. |

## Team Chat

| Area | Classification | Evidence |
|------|---------------|----------|
| Channel list & selection | ✅ Exists | `src/pages/TeamChat.tsx:42-80` renders channel sidebar with search. |
| Message thread | ✅ Exists | `src/pages/TeamChat.tsx:107-155` renders messages with avatars, timestamps, read receipts. |
| Send message | ✅ Exists (local only) | `src/pages/TeamChat.tsx:26-37` handleSend adds to local state. Not persisted. |
| File/image sharing | ❌ Missing | Not found after search of `src/pages/TeamChat.tsx`. Paperclip icon present but non-functional. |
| End-to-end encryption | ❌ Missing | Not found after search of `src/`. Notice text says "🔒 End-to-end encrypted" (`TeamChat.tsx:168`) but no encryption is implemented. Misleading. |
| Real-time delivery | ❌ Missing | Not found after search of `src/`. No WebSocket, no Supabase Realtime, no polling. |
| Read receipts (server-side) | ❌ Missing | Not found after search of `src/`. `readBy` array exists in type but only updated locally. |
| Reply threading | ❌ Missing | Not found after search of `src/pages/TeamChat.tsx`. `replyTo` field exists in type (`src/types/index.ts:103`) but no UI. |

## Finance & Costing

| Area | Classification | Evidence |
|------|---------------|----------|
| Journal entries | ✅ Exists, needs extension | `src/types/index.ts:130-142` defines FinanceEntry; `src/pages/Finance.tsx` displays table with debit/credit. Missing: double-entry validation, voucher creation form, posting workflow. |
| Chart of accounts | ❌ Missing | Not found after search of `src/`. Account is a free-text string in FinanceEntry. |
| Project costing | ⚠️ Exists but needs extension | FinanceEntry has `project` string field. Missing: cost centre hierarchy, WBS, budget vs actual. |
| GST calculation | ❌ Missing | Not found after search of `src/`. |
| E-invoice / E-way bill | ❌ Missing | Not found after search of `src/`. |

## Dashboards & Reports

| Area | Classification | Evidence |
|------|---------------|----------|
| Executive dashboard | ✅ Exists | `src/pages/Dashboard.tsx` has KPI cards, fuel trend, utilization bar chart, RMC production, financial summary. |
| Configurable KPIs | ❌ Missing | Not found after search of `src/`. KPIs are hardcoded in `Dashboard.tsx:8-13`. |
| Report generation (PDF/Excel) | ❌ Missing | Not found after search of `src/`. No export functionality. |
| Scheduled reports | ❌ Missing | Not found after search of `src/`. |

## Alerts & Notifications

| Area | Classification | Evidence |
|------|---------------|----------|
| Alert display | ✅ Exists | `src/pages/Alerts.tsx` renders alert cards with severity, recommended action, acknowledge/assign/dismiss buttons. |
| Alert generation (business rules) | ❌ Missing | Not found after search of `src/`. Alerts are static mock data. No rule engine evaluates thresholds. |
| Notification delivery (email/SMS/push) | ❌ Missing | Not found after search of `src/`. |
| Alert configuration | ❌ Missing | Not found after search of `src/`. No UI to configure thresholds or recipients. |

## Cross-Cutting Concerns

| Area | Classification | Evidence |
|------|---------------|----------|
| Authentication | ❌ Missing | Not found after search of `src/`. Profile dropdown in `Layout.tsx:82-100` is decorative. |
| Authorization / RBAC | ❌ Missing | Not found after search of `src/`. No role definitions, no permission checks. |
| Audit logging | ❌ Missing | Not found after search of `src/`. No audit trail for create/update/approve actions. |
| Document numbering service | ❌ Missing | Not found after search of `src/`. Order numbers and voucher numbers are hardcoded strings. |
| Multi-tenancy (company/project/site) | ❌ Missing | Not found after search of `src/`. Project is a string field, not a relational entity. |
| Data persistence | ❌ Missing | Not found after search of `src/`. All data in `mockData.ts` is in-memory. Refreshing the page resets everything. |
| API layer | ❌ Missing | Not found after search of `src/`. No HTTP client, no API routes, no backend. |
| Offline capability | ❌ Missing | Not found after search of `src/`. No service worker, no IndexedDB, no sync queue. |
| Error handling | ❌ Missing | Not found after search of `src/`. No error boundaries, no global error handler. |
| Accessibility (a11y) | ⚠️ Exists but needs extension | Semantic HTML used, but no ARIA labels, no keyboard navigation testing, no screen reader validation. |
