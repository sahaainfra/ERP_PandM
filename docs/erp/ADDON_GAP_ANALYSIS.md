# Add-on Gap Analysis (Parts 26–33)

**Date:** January 28, 2026  
**Scope:** Assessment of existing capabilities for attendance, geofencing, approvals, exports, and administration

---

## 1. HR, Employee, Attendance, Leave, Shift and Payroll

### Current State

**Status:** ⚠️ **Exists but needs extension**

#### Evidence from Code:

1. **Operator Management (Part 05)**
   - File: `src/services/operatorManagement.ts`
   - File: `src/services/assetLifecycleTypes.ts` (lines 294-342)
   - **Operator interface exists** with fields:
     - `employeeId?: string` — Link to employee if internal
     - `vendorId?: string` — Link to vendor if subcontractor
     - `type: 'internal' | 'subcontractor' | 'hired'`
     - `fullName`, `contactPhone`, `contactEmail`, `address`
     - Licence, certificates, training, competency tracking
     - `assignedAssets: string[]` — Asset assignments
     - `shiftSchedule?: string` — **Attendance link mentioned but not implemented**
   
2. **Role Definitions (Part 03)**
   - File: `src/services/roles.ts` (line 284)
   - `general_staff` role description mentions "attendance" but **no attendance service exists**

3. **Missing Components:**
   - ❌ No attendance punch/clock-in service
   - ❌ No leave management service
   - ❌ No shift scheduling service
   - ❌ No payroll calculation service
   - ❌ No work calendar service
   - ❌ No employee master (only operator master exists)
   - ❌ No attendance correction/approval workflow

#### What Exists:
- ✅ Operator master with employee link
- ✅ Shift schedule field (placeholder)
- ✅ Role structure (general_staff, site_manager, etc.)
- ✅ Permission framework for extensions

#### What Needs Extension:
- 🔧 Add employee master service (or extend operator)
- 🔧 Add attendance punch service with geofencing
- 🔧 Add leave management service
- 🔧 Add shift scheduling service
- 🔧 Add work calendar service
- 🔧 Add payroll calculation service
- 🔧 Add attendance correction workflow

#### Risks:
- **Data Migration:** Need to link existing operators to employee records
- **Privacy:** Attendance data contains personal information (location, time)
- **Performance:** Real-time attendance tracking may require high-frequency writes
- **Compliance:** Labour law compliance for working hours, overtime, leave accrual

---

## 2. Super-User / System Administrator Access

### Current State

**Status:** ✅ **Exists and reusable**

#### Evidence from Code:

1. **Role Definitions (Part 03)**
   - File: `src/services/roles.ts` (lines 20-35)
   - `super_admin` role defined with:
     - `canApprove: true`
     - `canPost: true`
     - `canAdmin: true`
     - `defaultScopes: ['company']`

2. **Permission Service (Part 03)**
   - File: `src/services/permissions.ts` (lines 102-115)
   - `hasPermission()` function checks:
     ```typescript
     if (userRole === 'super_admin') {
       return true; // Bypass all checks
     }
     ```
   - Super admin has unrestricted access to all resources and actions

3. **Emergency Access:**
   - No explicit emergency access mechanism documented
   - Super admin role serves as break-glass access
   - All super admin actions are audited via `recordAudit()`

#### What Exists:
- ✅ `super_admin` role with full permissions
- ✅ Permission bypass logic in `hasPermission()`
- ✅ Audit trail for all super admin actions
- ✅ Company-wide scope

#### What Needs Extension:
- 🔧 Document emergency access procedures
- 🔧 Add temporary super admin assignment (time-boxed)
- 🔧 Add super admin activity reporting
- 🔧 Consider multi-person approval for critical super admin actions

#### Risks:
- **Security:** Super admin has unrestricted access — must be tightly controlled
- **Audit:** All super admin actions must be logged and reviewed
- **Compliance:** May violate segregation of duties in some regulatory frameworks

---

## 3. Geofence / Location-Boundary Logic

### Current State

**Status:** ⚠️ **Exists but needs generalization**

#### Evidence from Code:

1. **Telematics Adapter (Part 12)**
   - File: `src/services/telematicsAdapter.ts` (lines 393-420)
   - `checkGeofencePresence()` function exists:
     ```typescript
     export async function checkGeofencePresence(
       assetId: string,
       geofenceId: string,
       date: string
     ): Promise<{
       present: boolean;
       entryTime?: string;
       exitTime?: string;
       durationMinutes?: number;
     }>
     ```
   - Checks if asset was inside geofence on given date
   - Uses `geofenceId` and `insideGeofence` flag from position data

2. **Telematics Position Type (Part 12)**
   - File: `src/services/integrationTypes.ts` (lines 115-135)
   - `TelematicsPosition` interface includes:
     - `latitude: number`
     - `longitude: number`
     - `accuracy?: number`
     - `geofenceId?: string`
     - `insideGeofence: boolean`

3. **Missing Components:**
   - ❌ No geofence master service (define geofences)
   - ❌ No point-in-geofence API (generic, not telematics-specific)
   - ❌ No circle/polygon geofence definitions
   - ❌ No buffer zone support
   - ❌ No geofence versioning
   - ❌ No geofence workflow/approval

#### What Exists:
- ✅ Telematics position tracking with geofence flags
- ✅ Basic geofence presence check for assets
- ✅ GPS coordinate storage

#### What Needs Extension:
- 🔧 Create geofence master service (circle/polygon definitions)
- 🔧 Add point-in-geofence API (generic, reusable)
- 🔧 Add buffer zone support (metres)
- 🔧 Add geofence versioning and effective dates
- 🔧 Add geofence workflow (create/edit via approval)
- 🔧 Link geofences to sites, plants, offices
- 🔧 Add geofence-based attendance validation

#### Risks:
- **Performance:** Point-in-polygon calculations can be expensive at scale
- **Accuracy:** GPS accuracy affects geofence reliability
- **Privacy:** Location tracking requires employee consent and data protection
- **Integration:** Must work with both telematics (Part 12) and mobile attendance (Part 27)

---

## 4. Export Service (PDF and Excel)

### Current State

**Status:** ⚠️ **Exists but needs completion**

#### Evidence from Code:

1. **Export Service (Part 24)**
   - File: `src/services/exportService.ts`
   - Supports formats: `pdf`, `excel`, `csv`, `json`
   - File naming: `report_{reportId}_{timestamp}.{extension}`
   - Excel extension: `.xlsx`

2. **Export Generation Functions:**
   - File: `src/services/exportService.ts` (lines 210-242)
   - **CSV:** ✅ Fully implemented
     ```typescript
     function generateCSV(data: any[], execution: any): string
     ```
   - **Excel:** ⚠️ Stub implementation
     ```typescript
     function generateExcel(data: any[], execution: any): string {
       // Stub implementation - would use a library like exceljs
       return `Excel file with ${data.length} rows`;
     }
     ```
   - **PDF:** ⚠️ Stub implementation
     ```typescript
     function generatePDF(data: any[], execution: any): string {
       // Stub implementation - would use a library like pdfkit
       return `PDF file with ${data.length} rows`;
     }
     ```

3. **Report Header (Part 24)**
   - File: `src/services/reportEngine.ts`
   - Report execution includes:
     - Report name and ID
     - Period (start/end dates)
     - Generated at and by
     - Data sources
     - Applied filters
     - Status included (approved/pending/posted)
     - Units and currency
     - Data freshness

#### What Exists:
- ✅ Export job management (create, track, download)
- ✅ CSV export fully implemented
- ✅ Report header metadata captured
- ✅ Permission checks for export
- ✅ Audit logging for exports

#### What Needs Extension:
- 🔧 Implement real PDF generation (use pdfkit or similar)
- 🔧 Implement real Excel generation (use exceljs or similar)
- 🔧 Add standard report header to PDF/Excel exports
- 🔧 Add formatting (currency, dates, percentages) to exports
- 🔧 Add charts/graphs to PDF exports
- 🔧 Add multi-sheet support to Excel exports

#### Risks:
- **Dependencies:** Need to add PDF/Excel generation libraries
- **Performance:** Large report exports may be slow
- **Memory:** Generating large PDFs/Excels may consume significant memory
- **Compatibility:** Ensure generated files open correctly in standard tools

---

## 5. Dashboard Framework and Action Center

### Current State

**Status:** ✅ **Exists and reusable**

#### Evidence from Code:

1. **Dashboard Framework (Part 22)**
   - File: `src/services/dashboardFramework.ts`
   - File: `src/services/dashboardTypes.ts`
   - **Dashboard Layout Management:**
     ```typescript
     export async function createDashboardLayout(params: {
       name: string;
       role: DashboardRole;
       widgets: DashboardWidget[];
       isDefault?: boolean;
       isEditable?: boolean;
       createdBy: string;
     }): Promise<DashboardLayout>
     ```
   - **Widget Types:** `kpi_card`, `trend_chart`, `comparison_chart`, `ranked_table`, `status_indicator`, `approval_queue`, `exception_summary`, `recent_activity`, `gauge_chart`, `stacked_bar`, `pie_chart`
   - **Widget Registration:** Widgets are part of layout definition
   - **Data Generation:** `generateDashboardData()` fetches data for all widgets

2. **KPI Registry (Part 22)**
   - File: `src/services/kpiRegistry.ts`
   - **KPI Definition:**
     ```typescript
     export async function createKPIDefinition(params: {
       name: string;
       description: string;
       category: string;
       formula: string;
       sourceTables: string[];
       statusFilter: string[];
       unit: string;
       decimalPlaces: number;
       defaultPeriod: string;
       ownerRole: string;
     }): Promise<KPIDefinition>
     ```
   - **15 Default KPIs** seeded across categories

3. **Aggregation Service (Part 22)**
   - File: `src/services/aggregationService.ts`
   - **KPI Aggregation:**
     ```typescript
     export async function aggregateKPI(
       kpiId: string,
       period: string,
       startDate: string,
       endDate: string,
       scope?: { companyId?: string; projectId?: string; siteId?: string; plantId?: string }
     ): Promise<AggregatedKPI>
     ```
   - Supports scope-based filtering
   - Caches aggregated results

4. **Alert Action Center (Part 23)**
   - File: `src/services/alertActionCenter.ts`
   - **Alert Management:**
     - Create alerts
     - Acknowledge, assign, escalate, resolve, close
     - Full audit trail
   - **Alert Types:** Defined in `alerts.ts` (Part 02)
   - **Alert Rules:** Configurable thresholds and conditions

5. **Dashboard UI (Part 22/23)**
   - File: `src/pages/ExecutiveDashboard.tsx`
   - File: `src/pages/FleetDashboard.tsx`
   - File: `src/pages/OperatorReportingDashboard.tsx`
   - File: `src/pages/FuelVerificationDashboard.tsx`
   - File: `src/pages/RMCProductionDashboard.tsx`
   - File: `src/pages/DispatchLogisticsDashboard.tsx`
   - File: `src/pages/FinancialDashboard.tsx`
   - File: `src/pages/AlertActionCenter.tsx`

#### What Exists:
- ✅ Dashboard layout creation and management
- ✅ Widget registration (11 widget types)
- ✅ KPI definition and registration
- ✅ KPI aggregation with scope filtering
- ✅ Alert action center with full workflow
- ✅ 7 specialized dashboards
- ✅ Real-time data refresh

#### What Needs Extension:
- 🔧 Document how to add new widget types
- 🔧 Document how to register new KPIs
- 🔧 Document how to add new alert types
- 🔧 Add widget type registry (dynamic registration)
- 🔧 Add KPI category extension mechanism
- 🔧 Add alert rule template library

#### Risks:
- **Performance:** Large dashboards with many widgets may be slow
- **Complexity:** Adding new widget types requires framework understanding
- **Maintenance:** Dashboard definitions may become outdated

---

## 6. Mobile/PWA Capability and Offline Queue

### Current State

**Status:** ✅ **Exists and reusable**

#### Evidence from Code:

1. **Offline Sync Service (Part 07)**
   - File: `src/services/offlineSync.ts`
   - File: `src/services/submissionTypes.ts` (lines 232-260)
   - **OfflineQueueItem interface:**
     ```typescript
     export interface OfflineQueueItem {
       id: string; // Client-generated UUID
       type: 'submission' | 'photo';
       submissionData?: Partial<OperatorSubmission>;
       photoData?: {
         submissionId: string;
         category: EvidenceCategory;
         fileBlob: Blob;
         captureTime: string;
         metadata?: Record<string, unknown>;
       };
       clientUuid: string;
       idempotencyKey: string;
       clientCaptureTime: string;
       retryCount: number;
       status: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
       lastError?: string;
       serverReceiptTime?: string;
       encrypted: boolean;
       encryptionKeyId?: string;
       createdAt: string;
       updatedAt: string;
     }
     ```
   - **Queue Management:**
     - `addToOfflineQueue()` — Add item to queue
     - `getOfflineQueueItem()` — Retrieve item
     - `listOfflineQueueItems()` — List all items
     - `updateOfflineQueueItem()` — Update item status
     - `removeFromOfflineQueue()` — Remove item
     - `syncOfflineQueue()` — Sync all pending items
     - `retryFailedItems()` — Retry failed items
     - `resolveConflict()` — Resolve sync conflicts

2. **Mobile Submission UI (Part 07)**
   - File: `src/pages/MobileSubmission.tsx`
   - Mobile-first design
   - Offline queue integration
   - Photo capture with metadata
   - GPS location capture

3. **PWA Manifest**
   - File: `public/manifest.json` (if exists)
   - Service worker for offline support
   - App icons and metadata

#### What Exists:
- ✅ Offline queue service with full CRUD
- ✅ Idempotency key support
- ✅ Retry logic with exponential back-off
- ✅ Conflict detection and resolution
- ✅ Encryption support
- ✅ Mobile submission UI
- ✅ Photo and location capture

#### What Needs Extension:
- 🔧 Extend `OfflineQueueItem.type` to include `'attendance_punch'`
- 🔧 Add attendance punch data structure
- 🔧 Add attendance punch sync logic
- 🔧 Test offline queue with attendance data
- 🔧 Ensure PWA manifest exists and is correct
- 🔧 Test service worker with attendance flows

#### Risks:
- **Data Loss:** Offline data must be persisted reliably
- **Conflicts:** Concurrent edits may cause sync conflicts
- **Battery:** Frequent sync attempts may drain mobile battery
- **Storage:** Offline queue may consume significant storage
- **Security:** Encrypted data must be handled securely

---

## Summary Table

| Capability | Status | Reusable? | Extension Required? | Risk Level |
|------------|--------|-----------|---------------------|------------|
| HR/Employee/Attendance | ⚠️ Partial | Yes | Yes — Major | High |
| Super-User Access | ✅ Complete | Yes | Minor | Medium |
| Geofence Logic | ⚠️ Partial | Yes | Yes — Moderate | Medium |
| Export Service (PDF/Excel) | ⚠️ Partial | Yes | Yes — Moderate | Medium |
| Dashboard Framework | ✅ Complete | Yes | Minor | Low |
| Offline Queue | ✅ Complete | Yes | Minor | Low |

---

## Recommendations

### High Priority (Must Do)
1. **Extend Operator to Employee Master** — Add employee-specific fields or create employee service
2. **Implement Attendance Service** — Clock-in/out with geofencing, leave, shifts
3. **Complete Export Service** — Implement real PDF and Excel generation
4. **Generalize Geofence Service** — Create reusable point-in-geofence API

### Medium Priority (Should Do)
1. **Document Emergency Access** — Define super admin procedures
2. **Extend Offline Queue** — Add attendance punch support
3. **Add Dashboard Extension Docs** — Document how to add widgets/KPIs/alerts

### Low Priority (Nice to Have)
1. **Add Geofence Workflow** — Approval process for geofence changes
2. **Add Export Formatting** — Charts, multi-sheet Excel, etc.
3. **Add Super Admin Reporting** — Activity logs and analytics

---

## Next Steps

1. Create geofence service (Part 26.2)
2. Complete export service (Part 26.3)
3. Extend permission model (Part 26.4)
4. Build attendance service (Part 27)
5. Build leave management (Part 28)
6. Build shift scheduling (Part 29)
7. Build payroll integration (Part 30)
8. Build platform administration (Part 31)
9. Mobile/PWA enhancements (Part 32)
10. Final integration testing (Part 33)

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Next Review:** After Part 26 implementation
