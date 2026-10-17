# ConstructERP — KPI Definitions

> This document will be populated incrementally by each part that introduces dashboard KPIs.

## Fleet Management KPIs

_To be defined in Part 03._

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| — | — | — | — | — |

## Fuel Management KPIs

_To be defined in Part 04._

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| — | — | — | — | — |

## RMC Operations KPIs

### Plant Production KPIs (Part 13)

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| Actual Production | Sum of approved batch volumes | m³ | ≥ Daily target | Batch records |
| Planned Production | Daily target × period days | m³ | — | Plant configuration |
| Production Variance | Actual - Planned | m³ | 0 | Calculated |
| Production Variance % | (Variance / Planned) × 100 | % | 0% | Calculated |
| Total Batches | Count of batches in period | count | — | Batch records |
| Batches per Hour | Total batches / Operating hours | batches/hr | ≥ Plant capacity | Calculated |
| Average Batch Cycle Time | Sum of batch durations / Total batches | minutes | < Mixer cycle time | Batch records |

### Plant Efficiency KPIs (Part 13)

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| Available Hours | Period hours - Downtime hours | hours | — | Calculated |
| Operating Hours | Sum of non-overlapping batch durations | hours | — | Batch records |
| Plant Utilization | (Operating hours / Available hours) × 100 | % | ≥ 80% | Calculated |
| Production Efficiency | (Actual production / Planned production) × 100 | % | ≥ 95% | Calculated |

### Plant Quality KPIs (Part 13)

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| Rejected Batches | Count of rejected batches | count | 0 | Batch records |
| Rejected Batches % | (Rejected / Total) × 100 | % | < 2% | Calculated |
| Wastage | Sum of (Target volume - Actual volume) for positive differences | m³ | 0 | Batch records |
| Tolerance Violations | Count of batches with tolerance violations | count | 0 | Batch records |

### Plant Downtime KPIs (Part 13)

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| Total Downtime | Sum of stoppage durations | minutes | 0 | Stoppage logs |
| Downtime by Reason | Grouped downtime by reason code | minutes | — | Stoppage logs |
| Average Downtime Duration | Total downtime / Number of stoppages | minutes | — | Calculated |
| Longest Stoppage | Maximum stoppage duration | minutes | — | Stoppage logs |
| Production Loss | Estimated production lost during downtime | m³ | 0 | Stoppage logs |

## Finance KPIs

### Part 21 — Finance and Costing KPIs

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| Revenue | SUM(invoices.total_amount) | INR | — | Invoices (Part 21) |
| Gross Margin | revenue - direct_costs | INR | — | Invoices, Work Orders, Fuel Issues |
| Fuel Expenditure | SUM(fuel_issues.total_cost) | INR | — | Fuel Issues (Part 09) |
| Maintenance Spend | SUM(work_orders.total_cost) | INR | — | Work Orders (Part 11) |
| RMC Cost per m³ | total_production_cost / total_production_m3 | INR/m³ | — | Plant Costs (Part 21), Batches (Part 13) |

## Dashboard KPIs

### Part 22 — Dashboard Framework KPIs

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| Total Assets | COUNT(assets) | count | — | Assets (Part 04) |
| Asset Utilization | (operational_assets / total_assets) * 100 | % | ≥80% | Assets (Part 04) |
| RMC Production | SUM(batch.actual_volume) | m³ | — | Batches (Part 13) |
| Fuel Verification Coverage | (verified_asset_days / expected_asset_days) * 100 | % | ≥95% | Fuel Verifications (Part 10), Daily Coverage (Part 06) |
| Pending Approvals | COUNT(submissions WHERE status = submitted) | count | 0 | Operator Submissions (Part 07) |
| Equipment Downtime | SUM(work_orders.downtime_hours) | hours | — | Work Orders (Part 11) |
| Open Orders | COUNT(orders WHERE status != completed) | count | — | RMC Orders (Part 17) |
| Dispatch Delays | COUNT(dispatches WHERE has_delay = true) | count | 0 | Dispatches (Part 18) |
| Calibration Compliance | (valid_instruments / total_instruments) * 100 | % | ≥95% | Calibration Records (Part 10), Measuring Instruments (Part 09) |
| Overdue PM | COUNT(pm_plans WHERE next_due_date < today) | count | 0 | PM Plans (Part 11) |

## Quality KPIs

_To be defined in Part 07._

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| — | — | — | — | — |
