# ConstructERP — Permission Matrix

> Last updated: Part 03 Implementation

## Overview

This document defines the complete permission matrix for the ConstructERP system. Permissions are enforced at the API level and control access to resources based on:

- **Role**: User's assigned role (e.g., site_manager, operator)
- **Resource**: Type of entity being accessed (e.g., equipment, operator_log)
- **Action**: Operation being performed (e.g., view, create, approve)
- **Scope**: Organizational boundary (e.g., company, project, site, own)

## Permission Actions

| Action | Description |
|--------|-------------|
| `view` | Read access to view records |
| `create` | Create new records |
| `edit` | Modify existing records |
| `delete` | Delete records |
| `submit` | Submit records for approval |
| `approve` | Approve submitted records |
| `reject` | Reject submitted records |
| `return` | Return records for correction |
| `post` | Post financial transactions |
| `reverse` | Reverse posted transactions |
| `export` | Export data to CSV/PDF |
| `administer` | Administrative operations |
| `view_cost` | View cost/salary fields |
| `view_personal` | View personal data fields |

## Permission Scopes

| Scope | Description |
|-------|-------------|
| `company` | Access to all records in the company |
| `region` | Access to records in assigned region |
| `project` | Access to records in assigned project |
| `site` | Access to records in assigned site |
| `plant` | Access to records in assigned plant |
| `department` | Access to records in assigned department |
| `own` | Access only to records created by the user |
| `assigned` | Access only to records/assets assigned to the user |

## Role Definitions

### Executive Roles

| Role | Description | Can Approve | Can Post |
|------|-------------|-------------|----------|
| `super_admin` | System Administrator with full access | ✅ | ✅ |
| `company_admin` | Managing Director / CEO / Director | ✅ | ✅ |

### Management Roles

| Role | Description | Can Approve | Can Post |
|------|-------------|-------------|----------|
| `project_manager` | Project Manager / Project Director | ✅ | ✅ |
| `site_manager` | Site Manager | ✅ | ❌ |
| `fleet_manager` | Fleet Manager | ✅ | ❌ |
| `plant_manager` | RMC Plant Manager | ✅ | ❌ |
| `maintenance_manager` | Maintenance Manager | ✅ | ❌ |
| `qc_manager` | Quality Control Manager | ✅ | ❌ |
| `accounts_manager` | Finance Manager / Accountant | ✅ | ✅ |
| `dispatch_manager` | Dispatch Manager | ✅ | ❌ |

### Operational Roles

| Role | Description | Can Approve | Can Post |
|------|-------------|-------------|----------|
| `site_engineer` | Site Engineer / Site Supervisor | ❌ | ❌ |
| `fleet_supervisor` | Fleet Supervisor | ❌ | ❌ |
| `fuel_officer` | Fuel In-charge / Fuel Attendant | ❌ | ❌ |
| `store_keeper` | Storekeeper | ❌ | ❌ |

### Technical Roles

| Role | Description | Can Approve | Can Post |
|------|-------------|-------------|----------|
| `operator` | Equipment Operator / Driver / Plant Operator | ❌ | ❌ |
| `technician` | Technician | ❌ | ❌ |
| `lab_staff` | Laboratory Staff | ❌ | ❌ |
| `calibration_officer` | Calibration Officer | ❌ | ❌ |

### Support Roles

| Role | Description | Can Approve | Can Post |
|------|-------------|-------------|----------|
| `procurement_officer` | Procurement Officer | ❌ | ❌ |
| `accounts_executive` | Accounts Executive | ❌ | ❌ |
| `logistics_staff` | Logistics Staff | ❌ | ❌ |
| `general_staff` | General Staff | ❌ | ❌ |

### Read-Only Roles

| Role | Description | Can Approve | Can Post |
|------|-------------|-------------|----------|
| `auditor` | Auditor (Read-Only) | ❌ | ❌ |
| `viewer` | Viewer / Authorized Chat User | ❌ | ❌ |

## Permission Matrix by Role

### Super Admin

**Scope**: Company-wide

| Resource | Permissions |
|----------|-------------|
| All Resources | `view`, `create`, `edit`, `delete`, `approve`, `post`, `reverse`, `export`, `administer`, `view_cost`, `view_personal` |

### Company Admin

**Scope**: Company-wide

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view`, `create`, `edit`, `approve`, `export`, `view_cost` |
| `project` | `view`, `create`, `edit` |
| `site` | `view`, `create`, `edit` |
| `user` | `view`, `create`, `edit`, `delete` |
| `journal_voucher` | `view`, `approve`, `post`, `reverse`, `view_cost` |
| `payment_voucher` | `view`, `approve`, `post`, `view_cost` |
| All other resources | `view`, `export`, `view_cost` |

### Project Manager

**Scope**: Assigned projects

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view`, `approve`, `export`, `view_cost` |
| `operator_log` | `view`, `approve` |
| `fuel_verification` | `view`, `approve` |
| `maintenance_order` | `view`, `approve`, `view_cost` |
| `journal_voucher` | `view`, `approve`, `view_cost` |
| `payment_voucher` | `view`, `approve`, `view_cost` |
| All other resources | `view`, `export` |

### Site Manager

**Scope**: Assigned sites

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view`, `edit`, `approve` |
| `operator_log` | `view`, `approve` |
| `fuel_issue` | `view`, `approve` |
| `fuel_verification` | `view`, `approve` |
| `maintenance_order` | `view`, `approve` |
| `rmc_order` | `view`, `approve` |
| All other resources | `view`, `export` |

### Fleet Manager

**Scope**: Company-wide (fleet)

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view`, `create`, `edit`, `approve`, `view_cost` |
| `operator_log` | `view`, `approve` |
| `fuel_issue` | `view`, `approve` |
| `fuel_verification` | `view`, `approve` |
| `maintenance_order` | `view`, `create`, `edit`, `approve`, `view_cost` |
| `calibration_record` | `view`, `approve` |
| All other resources | `view`, `export` |

### Plant Manager

**Scope**: Assigned plant

| Resource | Permissions |
|----------|-------------|
| `rmc_plant` | `view`, `edit` |
| `batch_ticket` | `view`, `approve` |
| `mix_design` | `view`, `create`, `edit`, `approve` |
| `qc_test` | `view`, `approve` |
| `rmc_order` | `view`, `approve` |
| `dispatch` | `view`, `approve` |
| All other resources | `view`, `export` |

### Maintenance Manager

**Scope**: Company-wide (maintenance)

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view`, `view_cost` |
| `maintenance_order` | `view`, `create`, `edit`, `approve`, `view_cost` |
| `calibration_record` | `view`, `approve` |
| All other resources | `view`, `export` |

### QC Manager

**Scope**: Company-wide (quality)

| Resource | Permissions |
|----------|-------------|
| `qc_test` | `view`, `create`, `edit`, `approve` |
| `mix_design` | `view`, `approve` |
| `batch_ticket` | `view` |
| All other resources | `view`, `export` |

### Accounts Manager

**Scope**: Company-wide (finance)

| Resource | Permissions |
|----------|-------------|
| `journal_voucher` | `view`, `create`, `edit`, `approve`, `post`, `reverse`, `view_cost` |
| `payment_voucher` | `view`, `create`, `edit`, `approve`, `post`, `view_cost` |
| `receipt_voucher` | `view`, `create`, `edit`, `approve`, `view_cost` |
| `purchase_order` | `view`, `view_cost` |
| All other resources | `view`, `export`, `view_cost` |

### Dispatch Manager

**Scope**: Assigned plant/project

| Resource | Permissions |
|----------|-------------|
| `dispatch` | `view`, `create`, `edit`, `approve` |
| `rmc_order` | `view`, `approve` |
| `batch_ticket` | `view` |
| All other resources | `view`, `export` |

### Site Engineer

**Scope**: Assigned site

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view` |
| `operator_log` | `view`, `create`, `edit`, `submit` |
| `rmc_order` | `view`, `create`, `edit`, `submit` |
| `material_request` | `view`, `create`, `edit`, `submit` |
| All other resources | `view` |

### Fleet Supervisor

**Scope**: Assigned project/site

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view` |
| `operator_log` | `view` |
| `fuel_issue` | `view`, `create`, `edit`, `submit` |
| All other resources | `view` |

### Fuel Officer

**Scope**: Assigned site/plant

| Resource | Permissions |
|----------|-------------|
| `fuel_issue` | `view`, `create`, `edit`, `submit` |
| `fuel_verification` | `view`, `create`, `edit`, `submit` |
| `equipment` | `view` |
| All other resources | `view` |

### Store Keeper

**Scope**: Assigned site/plant

| Resource | Permissions |
|----------|-------------|
| `item` | `view`, `create`, `edit` |
| `warehouse` | `view` |
| `goods_receipt` | `view`, `create`, `edit`, `submit` |
| `material_issue` | `view`, `create`, `edit`, `submit` |
| All other resources | `view` |

### Operator

**Scope**: Assigned assets / Own records

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view` (assigned only) |
| `operator_log` | `view`, `create`, `edit`, `submit` (own only) |
| `chat_channel` | `view`, `create` |
| `chat_message` | `view`, `create` |
| All other resources | `view` (assigned/own only) |

### Technician

**Scope**: Assigned site/plant

| Resource | Permissions |
|----------|-------------|
| `equipment` | `view` |
| `maintenance_order` | `view`, `create`, `edit`, `submit` |
| `chat_channel` | `view`, `create` |
| `chat_message` | `view`, `create` |
| All other resources | `view` |

### Lab Staff

**Scope**: Assigned plant/site

| Resource | Permissions |
|----------|-------------|
| `qc_test` | `view`, `create`, `edit`, `submit` |
| `batch_ticket` | `view` |
| All other resources | `view` |

### Calibration Officer

**Scope**: Company-wide (calibration)

| Resource | Permissions |
|----------|-------------|
| `calibration_record` | `view`, `create`, `edit`, `submit` |
| `equipment` | `view` |
| All other resources | `view` |

### Procurement Officer

**Scope**: Company-wide (procurement)

| Resource | Permissions |
|----------|-------------|
| `purchase_order` | `view`, `create`, `edit`, `submit` |
| `vendor` | `view`, `create`, `edit` |
| `goods_receipt` | `view` |
| All other resources | `view` |

### Accounts Executive

**Scope**: Company-wide (finance)

| Resource | Permissions |
|----------|-------------|
| `journal_voucher` | `view`, `create`, `edit`, `submit` |
| `payment_voucher` | `view`, `create`, `edit`, `submit` |
| `receipt_voucher` | `view`, `create`, `edit`, `submit` |
| All other resources | `view` |

### Logistics Staff

**Scope**: Assigned plant/site

| Resource | Permissions |
|----------|-------------|
| `dispatch` | `view`, `create`, `edit` |
| `rmc_order` | `view` |
| All other resources | `view` |

### General Staff

**Scope**: Assigned site

| Resource | Permissions |
|----------|-------------|
| `chat_channel` | `view`, `create` |
| `chat_message` | `view`, `create` |
| `notification` | `view` |
| All other resources | `view` |

### Auditor

**Scope**: Company-wide (read-only)

| Resource | Permissions |
|----------|-------------|
| All Resources | `view`, `export` |
| `audit_log` | `view`, `export` |

### Viewer

**Scope**: Assigned company/project/site

| Resource | Permissions |
|----------|-------------|
| `chat_channel` | `view` |
| `chat_message` | `view` |
| `notification` | `view` |
| All other resources | `view` |

## Field-Level Permissions

Certain fields are restricted based on permissions:

### Cost Fields (`view_cost` required)

- Equipment: `purchase_cost`, `depreciation`, `maintenance_cost`
- Maintenance Order: `estimated_cost`, `actual_cost`
- Journal Voucher: All amount fields
- Payment Voucher: All amount fields
- Purchase Order: `total_amount`, `unit_price`

### Personal Fields (`view_personal` required)

- User: `phone`, `email`, `address`, `aadhar_number`, `pan_number`
- Employee: `phone`, `email`, `address`, `bank_details`
- Operator: `license_number`, `phone`, `address`

## Approval Matrix

### Operator Log

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| Always | `site_manager` | 1 |

### Fuel Verification

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| `variance_percent` ≤ 5% | `site_manager` | 1 |
| `variance_percent` > 5% | `fleet_manager` | 1 |
| `variance_percent` > 20% | `project_manager` | 2 |

### Maintenance Order

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| `estimated_cost` ≤ ₹50,000 | `fleet_manager` | 1 |
| `estimated_cost` > ₹50,000 | `project_manager` | 1 |
| `estimated_cost` > ₹2,00,000 | `company_admin` | 2 |

### RMC Order

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| Always | `plant_manager` | 1 |

### Batch Ticket

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| Always | `plant_manager` | 1 |

### QC Test

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| Always | `qc_manager` | 1 |

### Journal Voucher

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| `amount` ≤ ₹1,00,000 | `accounts_manager` | 1 |
| `amount` > ₹1,00,000 | `company_admin` | 1 |

### Payment Voucher

| Condition | Required Approver | Level |
|-----------|------------------|-------|
| `amount` ≤ ₹50,000 | `accounts_manager` | 1 |
| `amount` > ₹50,000 | `project_manager` | 1 |
| `amount` > ₹5,00,000 | `company_admin` | 2 |

## Delegation Rules

### Who Can Delegate

Only users with `approve` permission can delegate their approval authority.

### Delegation Constraints

1. **Cannot delegate to self**: A user cannot delegate approval authority to themselves
2. **Role hierarchy**: Can only delegate to users with equal or lower role authority
3. **Date range**: Delegations must have start and end dates
4. **No overlaps**: Cannot have overlapping delegations for the same resource type
5. **Audit trail**: All delegation actions are audited

### Delegation Process

1. Delegator creates delegation specifying:
   - Delegate user
   - Resource type
   - Start date
   - End date
   - Reason
2. System validates constraints
3. Delegation becomes active on start date
4. Delegate can approve records during the delegation period
5. Delegation expires automatically on end date
6. All delegations are recorded in audit trail

## Escalation Rules

### Escalation Triggers

1. **Time-based**: Approval pending beyond configured threshold
2. **Delegation expiry**: Delegated authority expired without action
3. **Conflict of interest**: Approver has conflict with record

### Escalation Chain

| Resource | Level 1 | Level 2 | Level 3 |
|----------|---------|---------|---------|
| Operator Log | Site Manager | Project Manager | Company Admin |
| Fuel Verification | Site/Fleet Manager | Project Manager | Company Admin |
| Maintenance Order | Fleet/Project Manager | Company Admin | — |
| RMC Order | Plant Manager | Project Manager | Company Admin |
| Journal Voucher | Accounts Manager | Company Admin | — |
| Payment Voucher | Accounts/Project Manager | Company Admin | — |

### Escalation Timeouts

| Resource | Level 1 Timeout | Level 2 Timeout |
|----------|----------------|----------------|
| Operator Log | 24 hours | 48 hours |
| Fuel Verification | 12 hours | 24 hours |
| Maintenance Order | 48 hours | 72 hours |
| RMC Order | 4 hours | 24 hours |
| Journal Voucher | 72 hours | 96 hours |
| Payment Voucher | 48 hours | 72 hours |

## Permission Changes

### Audit Requirements

All permission changes are audited:

- **Who**: User making the change
- **When**: Timestamp
- **What**: Resource, role, action, scope
- **Why**: Reason for change
- **Before**: Previous permission state
- **After**: New permission state

### Effective Immediately

Permission changes take effect immediately on the next API request. No redeployment required.

### Admin UI

Administrators can manage permissions through the Admin UI:

- `/admin/permissions` — Main permissions dashboard
- View all roles and their permissions
- Grant/revoke permissions
- Create custom roles
- Manage delegations
- View approval matrix
- Audit permission changes

## Implementation Notes

### Enforcement Points

1. **API Level**: All API endpoints check permissions before processing
2. **Query Level**: List endpoints filter results based on user scope
3. **Field Level**: Sensitive fields filtered from responses
4. **UI Level**: Actions hidden/shown based on permissions (but API is the control)

### Performance Considerations

- Permission checks are cached in memory
- Scope filtering happens at database query level
- Field filtering happens after data retrieval

### Security Best Practices

1. Never trust client-side permission checks alone
2. Always enforce permissions at API level
3. Log all permission denials for security monitoring
4. Review permissions regularly
5. Use principle of least privilege
6. Implement separation of duties (maker-checker)

## Future Enhancements

1. **Custom roles**: Allow companies to create custom roles
2. **Dynamic permissions**: Permission based on record attributes
3. **Temporary access**: Time-bound permission grants
4. **Permission templates**: Pre-configured permission sets
5. **Bulk operations**: Grant/revoke permissions for multiple users
6. **Permission inheritance**: Child roles inherit parent permissions
7. **Cross-company permissions**: For multi-company users
8. **API key permissions**: For external integrations
