import { Equipment, OperatorLog, FuelRecord, RMCOrder, MixDesign, ChatMessage, ChatChannel, Alert, FinanceEntry } from '../types';

export const equipment: Equipment[] = [
  { id: '1', code: 'EQ-001', name: 'CAT 320 Excavator', type: 'excavator', registrationNo: 'MH-12-AB-1234', status: 'operational', project: 'Mumbai Metro Phase 3', operator: 'Rajesh Kumar', fuelCapacity: 400, currentFuel: 280, lastMaintenance: '2026-01-15', nextMaintenance: '2026-02-15', runningHours: 4520 },
  { id: '2', code: 'EQ-002', name: 'JCB 3DX Backhoe', type: 'loader', registrationNo: 'MH-12-CD-5678', status: 'operational', project: 'Pune Expressway', operator: 'Suresh Patil', fuelCapacity: 200, currentFuel: 120, lastMaintenance: '2026-01-20', nextMaintenance: '2026-02-20', runningHours: 3200 },
  { id: '3', code: 'EQ-003', name: 'Tata Crane HC-35', type: 'crane', registrationNo: 'MH-12-EF-9012', status: 'maintenance', project: 'Mumbai Metro Phase 3', operator: undefined, fuelCapacity: 300, currentFuel: 150, lastMaintenance: '2026-01-25', nextMaintenance: '2026-02-10', runningHours: 6100 },
  { id: '4', code: 'EQ-004', name: 'BOMAG BW 219 Roller', type: 'roller', registrationNo: 'MH-12-GH-3456', status: 'operational', project: 'Pune Expressway', operator: 'Manoj Singh', fuelCapacity: 250, currentFuel: 180, lastMaintenance: '2026-01-10', nextMaintenance: '2026-02-10', runningHours: 2800 },
  { id: '5', code: 'TM-001', name: 'Transit Mixer T-01', type: 'transit_mixer', registrationNo: 'MH-12-IJ-7890', status: 'operational', project: 'RMC Division', operator: 'Amit Sharma', fuelCapacity: 200, currentFuel: 90, lastMaintenance: '2026-01-18', nextMaintenance: '2026-02-18', runningHours: 5600 },
  { id: '6', code: 'TM-002', name: 'Transit Mixer T-02', type: 'transit_mixer', registrationNo: 'MH-12-KL-1234', status: 'idle', project: 'RMC Division', operator: undefined, fuelCapacity: 200, currentFuel: 200, lastMaintenance: '2026-01-22', nextMaintenance: '2026-02-22', runningHours: 4200 },
  { id: '7', code: 'BP-001', name: 'RMC Batch Plant Alpha', type: 'batch_plant', registrationNo: 'PLANT-ALPHA', status: 'operational', project: 'RMC Division', operator: 'Vikram Desai', fuelCapacity: 500, currentFuel: 350, lastMaintenance: '2026-01-05', nextMaintenance: '2026-02-05', runningHours: 8900 },
  { id: '8', code: 'CP-001', name: 'Schwing Stetter Pump SP-30', type: 'pump', registrationNo: 'MH-12-MN-5678', status: 'operational', project: 'Mumbai Metro Phase 3', operator: 'Deepak Yadav', fuelCapacity: 150, currentFuel: 80, lastMaintenance: '2026-01-12', nextMaintenance: '2026-02-12', runningHours: 3400 },
];

export const operatorLogs: OperatorLog[] = [
  { id: '1', equipmentId: '1', equipmentName: 'CAT 320 Excavator', operatorName: 'Rajesh Kumar', date: '2026-01-28', startTime: '07:00', endTime: '17:00', runningHours: 8.5, fuelConsumed: 142, fuelIssued: 150, openingReading: 4512, closingReading: 4520, workDescription: 'Foundation excavation Zone A - 450 m³', status: 'approved', dataSource: 'manual', submittedAt: '2026-01-28T17:30:00Z', approvedBy: 'Site Manager', approvedAt: '2026-01-28T18:00:00Z', photos: [] },
  { id: '2', equipmentId: '2', equipmentName: 'JCB 3DX Backhoe', operatorName: 'Suresh Patil', date: '2026-01-28', startTime: '06:30', endTime: '16:30', runningHours: 9.0, fuelConsumed: 98, fuelIssued: 100, openingReading: 3192, closingReading: 3200, workDescription: 'Trenching for drainage - 280 m', status: 'pending_approval', dataSource: 'manual', submittedAt: '2026-01-28T16:45:00Z', photos: [] },
  { id: '3', equipmentId: '4', equipmentName: 'BOMAG BW 219 Roller', operatorName: 'Manoj Singh', date: '2026-01-28', startTime: '07:00', endTime: '15:00', runningHours: 7.5, fuelConsumed: 82, fuelIssued: 85, openingReading: 2793, closingReading: 2800, workDescription: 'Road compaction Chainage 12.5-13.2 km', status: 'submitted', dataSource: 'manual', submittedAt: '2026-01-28T15:30:00Z', photos: [] },
  { id: '4', equipmentId: '5', equipmentName: 'Transit Mixer T-01', operatorName: 'Amit Sharma', date: '2026-01-28', startTime: '06:00', endTime: '18:00', runningHours: 10.0, fuelConsumed: 165, fuelIssued: 170, openingReading: 5590, closingReading: 5600, workDescription: '6 trips to Metro site - 36 m³ delivered', status: 'approved', dataSource: 'manual', submittedAt: '2026-01-28T18:15:00Z', approvedBy: 'Plant Manager', approvedAt: '2026-01-28T19:00:00Z', photos: [] },
  { id: '5', equipmentId: '8', equipmentName: 'Schwing Stetter Pump SP-30', operatorName: 'Deepak Yadav', date: '2026-01-28', startTime: '08:00', endTime: '16:00', runningHours: 7.0, fuelConsumed: 58, fuelIssued: 60, openingReading: 3393, closingReading: 3400, workDescription: 'Pumping M30 concrete for slab casting - 120 m³', status: 'rejected', dataSource: 'manual', submittedAt: '2026-01-28T16:30:00Z', rejectionReason: 'Opening reading mismatch with previous day closing', photos: [] },
];

export const fuelRecords: FuelRecord[] = [
  { id: '1', equipmentId: '1', equipmentName: 'CAT 320 Excavator', date: '2026-01-28', fuelIssued: 150, fuelConsumed: 142, expectedConsumption: 136, variance: 6, variancePercent: 4.4, dataSource: 'manual', status: 'approved', verifiedBy: 'Fuel Officer' },
  { id: '2', equipmentId: '2', equipmentName: 'JCB 3DX Backhoe', date: '2026-01-28', fuelIssued: 100, fuelConsumed: 98, expectedConsumption: 90, variance: 8, variancePercent: 8.9, dataSource: 'manual', status: 'pending_approval' },
  { id: '3', equipmentId: '4', equipmentName: 'BOMAG BW 219 Roller', date: '2026-01-28', fuelIssued: 85, fuelConsumed: 82, expectedConsumption: 75, variance: 7, variancePercent: 9.3, dataSource: 'manual', status: 'submitted' },
  { id: '4', equipmentId: '5', equipmentName: 'Transit Mixer T-01', date: '2026-01-28', fuelIssued: 170, fuelConsumed: 165, expectedConsumption: 155, variance: 10, variancePercent: 6.5, dataSource: 'manual', status: 'approved', verifiedBy: 'Fuel Officer' },
  { id: '5', equipmentId: '8', equipmentName: 'Schwing Stetter Pump SP-30', date: '2026-01-28', fuelIssued: 60, fuelConsumed: 58, expectedConsumption: 52, variance: 6, variancePercent: 11.5, dataSource: 'manual', status: 'rejected' },
];

export const rmcOrders: RMCOrder[] = [
  { id: '1', orderNo: 'RMC/2026-27/001', plant: 'RMC Plant Alpha', projectName: 'Mumbai Metro Phase 3', siteName: 'Andheri East Shaft', grade: 'M30', quantity: 200, delivered: 156, status: 'approved', orderDate: '2026-01-25', deliveryDate: '2026-01-28', transitMixers: 3, pumpRequired: true, specialInstructions: 'Slump 150mm, pumping grade' },
  { id: '2', orderNo: 'RMC/2026-27/002', plant: 'RMC Plant Alpha', projectName: 'Skyline Residency', siteName: 'Borivali West', grade: 'M25', quantity: 80, delivered: 80, status: 'posted', orderDate: '2026-01-26', deliveryDate: '2026-01-27', transitMixers: 2, pumpRequired: false },
  { id: '3', orderNo: 'RMC/2026-27/003', plant: 'RMC Plant Alpha', projectName: 'Pune Expressway', siteName: 'Viaduct Section 4', grade: 'M40', quantity: 500, delivered: 120, status: 'approved', orderDate: '2026-01-27', deliveryDate: '2026-01-29', transitMixers: 5, pumpRequired: true, specialInstructions: 'High strength, retarder required' },
  { id: '4', orderNo: 'RMC/2026-27/004', plant: 'RMC Plant Alpha', projectName: 'Mumbai Metro Phase 3', siteName: 'Dahisar Station', grade: 'M35', quantity: 150, delivered: 0, status: 'submitted', orderDate: '2026-01-28', deliveryDate: '2026-01-30', transitMixers: 3, pumpRequired: true },
];

export const mixDesigns: MixDesign[] = [
  { id: '1', code: 'MD-M25-001', grade: 'M25', cement: 340, sand: 720, aggregate20mm: 540, aggregate12mm: 540, water: 170, admixture: 1700, wcratio: 0.50, slump: 100, targetStrength: 33, status: 'active' },
  { id: '2', code: 'MD-M30-001', grade: 'M30', cement: 390, sand: 700, aggregate20mm: 520, aggregate12mm: 520, water: 168, admixture: 1950, wcratio: 0.43, slump: 120, targetStrength: 38, status: 'active' },
  { id: '3', code: 'MD-M35-001', grade: 'M35', cement: 420, sand: 680, aggregate20mm: 510, aggregate12mm: 510, water: 165, admixture: 2100, wcratio: 0.39, slump: 150, targetStrength: 43, status: 'active' },
  { id: '4', code: 'MD-M40-001', grade: 'M40', cement: 450, sand: 660, aggregate20mm: 500, aggregate12mm: 500, water: 162, admixture: 2250, wcratio: 0.36, slump: 150, targetStrength: 48, status: 'approved' },
];

export const chatChannels: ChatChannel[] = [
  { id: '1', name: 'Mumbai Metro Phase 3', type: 'project', members: 24, unread: 3, lastMessage: 'Pour scheduled for tomorrow 7 AM', lastMessageTime: '2 min ago' },
  { id: '2', name: 'RMC Plant Operations', type: 'plant', members: 12, unread: 0, lastMessage: 'Batch plant calibration done', lastMessageTime: '15 min ago' },
  { id: '3', name: 'Pune Expressway', type: 'project', members: 18, unread: 7, lastMessage: 'Roller compaction completed', lastMessageTime: '30 min ago' },
  { id: '4', name: 'Fleet Maintenance', type: 'department', members: 8, unread: 1, lastMessage: 'Crane SP-30 needs hydraulic check', lastMessageTime: '1 hr ago' },
  { id: '5', name: 'Rajesh Kumar', type: 'direct', members: 2, unread: 0, lastMessage: 'OK, will check the readings', lastMessageTime: '2 hr ago' },
];

export const chatMessages: ChatMessage[] = [
  { id: '1', channelId: '1', senderId: 'u1', senderName: 'Vikram Desai', senderAvatar: 'VD', content: 'Good morning team. Today\'s pour schedule: Shaft A3 - M30 grade, 45 m³. Pump SP-30 will be deployed.', timestamp: '2026-01-28T06:00:00Z', type: 'text', readBy: ['u1', 'u2', 'u3'] },
  { id: '2', channelId: '1', senderId: 'u2', senderName: 'Rajesh Kumar', senderAvatar: 'RK', content: 'Noted. Excavator ready at shaft. Foundation level achieved yesterday.', timestamp: '2026-01-28T06:15:00Z', type: 'text', readBy: ['u1', 'u2', 'u3'] },
  { id: '3', channelId: '1', senderId: 'u3', senderName: 'Amit Sharma', senderAvatar: 'AS', content: 'First transit mixer dispatched at 6:30 AM. ETA 25 minutes to site.', timestamp: '2026-01-28T06:35:00Z', type: 'text', readBy: ['u1', 'u2', 'u3'] },
  { id: '4', channelId: '1', senderId: 'u1', senderName: 'Vikram Desai', senderAvatar: 'VD', content: 'Please ensure slump test is done for every truck. Target 150mm ±25mm.', timestamp: '2026-01-28T07:00:00Z', type: 'text', readBy: ['u1', 'u2', 'u3'] },
  { id: '5', channelId: '1', senderId: 'u4', senderName: 'Deepak Yadav', senderAvatar: 'DY', content: 'Pump primed and ready. Pipeline laid to casting area.', timestamp: '2026-01-28T07:15:00Z', type: 'text', readBy: ['u1', 'u2', 'u3'] },
  { id: '6', channelId: '1', senderId: 'u2', senderName: 'Rajesh Kumar', senderAvatar: 'RK', content: 'First truck arrived. Slump test: 148mm ✅ Within limits.', timestamp: '2026-01-28T07:45:00Z', type: 'text', readBy: ['u1', 'u2', 'u3'] },
  { id: '7', channelId: '1', senderId: 'u3', senderName: 'Amit Sharma', senderAvatar: 'AS', content: 'Pour scheduled for tomorrow 7 AM', timestamp: '2026-01-28T08:00:00Z', type: 'text', readBy: ['u1'] },
];

export const alerts: Alert[] = [
  { id: '1', severity: 'critical', title: 'Fuel Variance Exceeds Threshold', description: 'Schwing Pump SP-30 shows 11.5% fuel variance (6L above expected). Investigate immediately.', affectedRecord: 'FR-2026-01-28-005', responsiblePerson: 'Fuel Officer', createdAt: '2026-01-28T16:30:00Z', dueAt: '2026-01-29T10:00:00Z', status: 'open', recommendedAction: 'Verify fuel meter calibration and check for leaks', module: 'Fuel Management' },
  { id: '2', severity: 'high', title: 'Equipment Maintenance Overdue', description: 'RMC Batch Plant Alpha maintenance was due on 2026-02-05. Schedule immediately to avoid breakdown.', affectedRecord: 'EQ-BP-001', responsiblePerson: 'Maintenance Manager', createdAt: '2026-01-28T08:00:00Z', dueAt: '2026-01-29T17:00:00Z', status: 'open', recommendedAction: 'Schedule preventive maintenance within 24 hours', module: 'Fleet Management' },
  { id: '3', severity: 'high', title: 'Operator Log Rejected - Reading Mismatch', description: 'Pump operator Deepak Yadav\'s log rejected due to opening reading mismatch with previous day closing.', affectedRecord: 'OL-2026-01-28-005', responsiblePerson: 'Deepak Yadav', createdAt: '2026-01-28T16:45:00Z', dueAt: '2026-01-29T08:00:00Z', status: 'open', recommendedAction: 'Operator to re-submit with corrected readings and photo evidence', module: 'Operator Reports' },
  { id: '4', severity: 'medium', title: 'RMC Order Partially Delivered', description: 'Order RMC/2026-27/001 has 156 m³ delivered out of 200 m³ ordered. 44 m³ pending.', affectedRecord: 'RMC/2026-27/001', responsiblePerson: 'Dispatch Manager', createdAt: '2026-01-28T14:00:00Z', dueAt: '2026-01-29T12:00:00Z', status: 'acknowledged', recommendedAction: 'Confirm remaining delivery schedule with plant', module: 'RMC Operations' },
  { id: '5', severity: 'medium', title: 'Fuel Stock Low - Transit Mixer T-01', description: 'Transit Mixer T-01 fuel level at 45% (90L of 200L). Refuel before next trip.', affectedRecord: 'TM-001', responsiblePerson: 'Fleet Coordinator', createdAt: '2026-01-28T12:00:00Z', status: 'resolved', recommendedAction: 'Arrange refueling at next available fuel point', module: 'Fuel Management' },
  { id: '6', severity: 'low', title: 'Pending Approvals - 3 Operator Logs', description: '3 operator logs awaiting approval for 2026-01-28. Review and approve/reject.', responsiblePerson: 'Site Manager', createdAt: '2026-01-28T18:00:00Z', dueAt: '2026-01-29T09:00:00Z', status: 'open', recommendedAction: 'Review pending logs in Operator Reports module', module: 'Operator Reports' },
];

export const financeEntries: FinanceEntry[] = [
  { id: '1', date: '2026-01-28', voucherNo: 'JV/2026-27/045', account: 'Diesel Expense', project: 'Mumbai Metro Phase 3', debit: 45000, credit: 0, description: 'Fuel consumed by fleet - Jan 28', status: 'posted', createdBy: 'Accounts Jr.' },
  { id: '2', date: '2026-01-28', voucherNo: 'JV/2026-27/046', account: 'Equipment Depreciation', project: 'Mumbai Metro Phase 3', debit: 28000, credit: 0, description: 'Monthly depreciation - Excavators', status: 'posted', createdBy: 'Accounts Jr.' },
  { id: '3', date: '2026-01-28', voucherNo: 'JV/2026-27/047', account: 'RMC Revenue', project: 'Skyline Residency', debit: 0, credit: 480000, description: 'RMC sales - 80 m³ M25 @ ₹6,000/m³', status: 'posted', createdBy: 'Accounts Jr.' },
  { id: '4', date: '2026-01-28', voucherNo: 'JV/2026-27/048', account: 'Maintenance Spares', project: 'Pune Expressway', debit: 35000, credit: 0, description: 'Roller drum replacement parts', status: 'submitted', createdBy: 'Store Keeper' },
  { id: '5', date: '2026-01-27', voucherNo: 'JV/2026-27/044', account: 'Labour Charges', project: 'Mumbai Metro Phase 3', debit: 125000, credit: 0, description: 'Daily wage labour - Week 4', status: 'approved', createdBy: 'HR Manager' },
];

export const fuelTrendData = [
  { date: 'Jan 22', issued: 820, consumed: 780, expected: 760 },
  { date: 'Jan 23', issued: 850, consumed: 810, expected: 790 },
  { date: 'Jan 24', issued: 790, consumed: 755, expected: 740 },
  { date: 'Jan 25', issued: 880, consumed: 845, expected: 820 },
  { date: 'Jan 26', issued: 910, consumed: 870, expected: 850 },
  { date: 'Jan 27', issued: 860, consumed: 830, expected: 810 },
  { date: 'Jan 28', issued: 565, consumed: 545, expected: 503 },
];

export const productionData = [
  { month: 'Oct', production: 4200, target: 4500 },
  { month: 'Nov', production: 4800, target: 4500 },
  { month: 'Dec', production: 5100, target: 5000 },
  { month: 'Jan', production: 3800, target: 5000 },
];

export const equipmentUtilization = [
  { name: 'Excavators', utilization: 78, total: 3 },
  { name: 'Loaders', utilization: 85, total: 2 },
  { name: 'Cranes', utilization: 62, total: 2 },
  { name: 'Rollers', utilization: 91, total: 4 },
  { name: 'Transit Mixers', utilization: 73, total: 8 },
  { name: 'Pumps', utilization: 68, total: 3 },
];
