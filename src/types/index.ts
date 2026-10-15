export type Status = 'draft' | 'submitted' | 'pending_approval' | 'approved' | 'rejected' | 'returned' | 'posted' | 'reversed';
export type DataSource = 'manual' | 'imported' | 'integrated_live' | 'integrated_delayed' | 'system_calculated';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Equipment {
  id: string;
  code: string;
  name: string;
  type: 'excavator' | 'loader' | 'crane' | 'roller' | 'grader' | 'transit_mixer' | 'pump' | 'generator' | 'batch_plant';
  registrationNo: string;
  status: 'operational' | 'maintenance' | 'idle' | 'decommissioned';
  project: string;
  operator?: string;
  fuelCapacity: number; // litres
  currentFuel: number; // litres
  lastMaintenance: string;
  nextMaintenance: string;
  runningHours: number;
}

export interface OperatorLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  operatorName: string;
  date: string;
  startTime: string;
  endTime: string;
  runningHours: number;
  fuelConsumed: number; // litres
  fuelIssued: number; // litres
  openingReading: number; // km or hours
  closingReading: number;
  workDescription: string;
  status: Status;
  dataSource: DataSource;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  photos: string[];
}

export interface FuelRecord {
  id: string;
  equipmentId: string;
  equipmentName: string;
  date: string;
  fuelIssued: number; // litres
  fuelConsumed: number; // litres
  expectedConsumption: number; // litres
  variance: number; // litres
  variancePercent: number;
  dataSource: DataSource;
  verifiedBy?: string;
  status: Status;
  notes?: string;
}

export interface RMCOrder {
  id: string;
  orderNo: string;
  plant: string;
  projectName: string;
  siteName: string;
  grade: string;
  quantity: number; // m³
  delivered: number; // m³
  status: Status;
  orderDate: string;
  deliveryDate: string;
  transitMixers: number;
  pumpRequired: boolean;
  specialInstructions?: string;
}

export interface MixDesign {
  id: string;
  code: string;
  grade: string;
  cement: number; // kg/m³
  sand: number; // kg/m³
  aggregate20mm: number; // kg/m³
  aggregate12mm: number; // kg/m³
  water: number; // litres/m³
  admixture: number; // ml/m³
  wcratio: number;
  slump: number; // mm
  targetStrength: number; // MPa
  status: 'draft' | 'approved' | 'active' | 'superseded';
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  readBy: string[];
  replyTo?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: 'project' | 'plant' | 'department' | 'direct';
  members: number;
  unread: number;
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  description: string;
  affectedRecord?: string;
  responsiblePerson: string;
  createdAt: string;
  dueAt?: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  recommendedAction: string;
  module: string;
}

export interface FinanceEntry {
  id: string;
  date: string;
  voucherNo: string;
  account: string;
  project: string;
  debit: number;
  credit: number;
  description: string;
  status: Status;
  createdBy: string;
  approvedBy?: string;
}

export interface DashboardKPI {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
  color: string;
}
