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

_To be defined in Part 06._

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| — | — | — | — | — |

## Quality KPIs

_To be defined in Part 07._

| KPI | Formula | Unit | Target | Data Source |
|-----|---------|------|--------|-------------|
| — | — | — | — | — |
