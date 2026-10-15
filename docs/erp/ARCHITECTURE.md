# ConstructERP — Architecture

## Overview
Production-ready Construction ERP ecosystem covering:
- Fleet and heavy-equipment management
- Operator reporting with senior approval workflow
- Daily calibrated fuel-consumption verification
- RMC plants, mix designs, quality, orders, dispatch
- Signal-inspired Team Chat
- Finance and costing
- Executive dashboards, alerts, reports and audit

## Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 18.2 |
| Build | Vite | 6.x |
| Styling | Tailwind CSS | 4.x |
| Routing | React Router | 6.x |
| Charts | Recharts | 2.x |
| Icons | Lucide React | 0.294 |
| State | React useState/useEffect | Built-in |

## Module Architecture
```
src/
├── App.tsx              # Main router entry
├── main.tsx             # React DOM entry
├── index.css            # Tailwind imports
├── types/
│   └── index.ts         # TypeScript interfaces
├── data/
│   └── mockData.ts      # Sample operational data
├── components/
│   ├── Layout.tsx       # App shell with sidebar
│   └── Badges.tsx       # Status/Severity badges + formatters
└── pages/
    ├── Dashboard.tsx    # Executive dashboard
    ├── FleetManagement.tsx
    ├── FuelManagement.tsx
    ├── RMCOperations.tsx
    ├── TeamChat.tsx
    ├── Finance.tsx
    └── Alerts.tsx
```

## Data Model Principles
1. Every record carries a `status` field (draft → submitted → pending_approval → approved/rejected)
2. Every reading records its `dataSource` (manual, imported, integrated_live, etc.)
3. All monetary values in INR with Indian digit grouping
4. All timestamps stored/displayed in Asia/Kolkata
5. All quantities in SI units with explicit unit codes

## Integration Status
| Integration | Status | Notes |
|-------------|--------|-------|
| GPS Tracking | ⚠️ Unavailable | Interface ready, awaiting device configuration |
| Fuel Meters (IoT) | ⚠️ Unavailable | Manual entry with variance calculation |
| Weighbridge | ⚠️ Unavailable | Interface ready for serial/API integration |
| GST Portal | ⚠️ Unavailable | Tax calculations ready, filing not connected |
| Bank Integration | ⚠️ Unavailable | Payment interface ready |
