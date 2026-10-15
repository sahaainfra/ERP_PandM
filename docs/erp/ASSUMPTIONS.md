# ConstructERP — Assumptions

## Infrastructure Assumptions

| ID | Assumption | Status | Verified | Notes |
|----|-----------|--------|----------|-------|
| A-001 | PostgreSQL 15+ will be used as the primary database | Assumed | No | Not yet provisioned. Will be confirmed in Part 02. |
| A-002 | Node.js 18+ LTS runtime for backend | Assumed | No | Build environment uses Node.js; backend runtime not yet chosen. |
| A-003 | Express.js or Fastify for REST API | Assumed | No | Decision pending in Part 02. |
| A-004 | Redis for caching and session store | Assumed | No | Not yet provisioned. |
| A-005 | S3-compatible storage for files (photos, documents) | Assumed | No | Could use Supabase Storage, MinIO, or AWS S3. |

## Business Assumptions

| ID | Assumption | Status | Verified | Notes |
|----|-----------|--------|----------|-------|
| A-010 | Single company deployment initially (multi-tenancy added later) | Assumed | No | Current data model has no company_id. |
| A-011 | Financial year is April–March (Indian standard) | Assumed | Yes | Referenced in Part 00 conventions. |
| A-012 | Currency is INR (Indian Rupee) exclusively | Assumed | Yes | All formatters use en-IN locale. |
| A-013 | Default timezone is Asia/Kolkata (IST, UTC+5:30) | Assumed | Yes | All date formatters use this timezone. |
| A-014 | GST rates follow current CBIC notifications | Assumed | No | Rates not yet encoded. Must verify against cbic.gov.in before Part 18. |
| A-015 | Fuel consumption norms follow equipment manufacturer specifications | Assumed | No | Actual norms must be calibrated per site conditions. |
| A-016 | RMC mix designs follow IS 10262:2019 guidelines | Assumed | No | Mix design proportions must be verified by qualified engineer. |
| A-017 | Operator working hours comply with Factories Act / Motor Vehicles Act limits | Assumed | No | Maximum hours per day/week not yet enforced. |

## Integration Assumptions

| ID | Assumption | Status | Verified | Notes |
|----|-----------|--------|----------|-------|
| A-020 | GPS devices use standard NMEA 0183 protocol or proprietary API with REST interface | Assumed | No | Device models not yet selected. |
| A-021 | Fuel meters provide serial output (RS-232/RS-485) or HTTP API | Assumed | No | Meter models not yet selected. |
| A-022 | Weighbridge provides serial output or OPC-UA interface | Assumed | No | Weighbridge model not yet selected. |
| A-023 | GST e-invoice uses IRP API as per GSTN specification | Assumed | Yes | Standard GSTN interface. |
| A-024 | SMS gateway supports HTTP API (e.g., MSG91, Twilio) | Assumed | No | Provider not yet selected. |
| A-025 | Email delivery via SMTP (e.g., AWS SES, SendGrid) | Assumed | No | Provider not yet selected. |

## User & Deployment Assumptions

| ID | Assumption | Status | Verified | Notes |
|----|-----------|--------|----------|-------|
| A-030 | Primary users access via Chrome/Edge on Windows desktop | Assumed | No | Mobile support needed for site operators. |
| A-031 | Site operators use Android smartphones (Chrome mobile) | Assumed | No | Responsive design covers this but not tested. |
| A-032 | Network connectivity at sites is intermittent (2G/3G/4G) | Assumed | No | Offline capability required (Part 12+). |
| A-033 | Users are comfortable with English + Hindi interface | Assumed | No | i18n not yet implemented. |
| A-034 | Deployment on Indian data center (Mumbai/Chennai region) | Assumed | No | Data residency requirement for some clients. |

## Unavailable Integrations (Recorded per Principle 10)

| Integration | Reason Unavailable | Interface Status |
|-------------|-------------------|-----------------|
| GPS Tracking | No devices configured | Placeholder UI in RMC dispatch tab |
| Fuel IoT Meters | No meters installed | Manual entry with variance calculation |
| Weighbridge | No weighbridge connected | Not yet implemented |
| PLC/SCADA (Batch Plant) | No plant automation interface | Not yet implemented |
| Bank Payment Gateway | No bank credentials | Not yet implemented |
| GST E-Invoice IRP | No GSTN credentials | Not yet implemented |
| SMS Gateway | No provider configured | Not yet implemented |
| Email (SMTP) | No SMTP credentials | Not yet implemented |
