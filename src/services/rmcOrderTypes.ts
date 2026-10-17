/**
 * Part 17 — RMC Order Types
 */

import { Status } from './types';

// ============================================================================
// RMC Order
// ============================================================================

export type OrderType = 'customer' | 'internal';
export type PourType = 'slab' | 'column' | 'beam' | 'footing' | 'wall' | 'other';
export type OrderStatus = 
  | 'draft' 
  | 'submitted' 
  | 'approved' 
  | 'scheduled' 
  | 'in_production' 
  | 'partially_delivered' 
  | 'completed' 
  | 'cancelled' 
  | 'on_hold';

export interface RMCOrder {
  id: string;
  orderNumber: string;
  
  // Customer/Project
  orderType: OrderType;
  customerId?: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  
  // Delivery details
  deliverySiteName: string;
  deliverySiteAddress: string;
  deliverySiteCoordinates?: { lat: number; lng: number };
  siteContactName?: string;
  siteContactPhone?: string;
  
  // References
  purchaseOrderNumber?: string;
  workOrderNumber?: string;
  
  // Product
  grade: string;
  mixDesignId: string;
  mixDesignRevision: number;
  customerSpecificMix: boolean;
  
  // Quantity
  requiredQuantity: number; // m³
  deliveredQuantity: number; // m³
  remainingQuantity: number; // m³
  
  // Pour details
  pourType: PourType;
  structuralElement?: string;
  
  // Schedule
  requestedDate: string;
  requestedStartTime: string;
  pourRate: number; // m³/hr
  scheduledDate?: string;
  scheduledStartTime?: string;
  
  // Equipment requirements
  pumpRequired: boolean;
  pumpType?: 'boom' | 'line' | 'static';
  pumpBoomLength?: number; // meters
  
  // Special requirements
  specialRequirements: string[];
  retarderRequired: boolean;
  temperatureControlRequired: boolean;
  nightPour: boolean;
  specialInstructions?: string;
  
  // Commercial terms (cost-restricted)
  ratePerM3: number;
  pumpingCharges?: number;
  minimumLoadCharges?: number;
  waitingCharges?: number;
  gstRate: number;
  creditTerms?: string;
  advanceReceived?: number;
  
  // Status
  status: OrderStatus;
  
  // Approvals
  creditApproved: boolean;
  creditApprovedBy?: string;
  creditApprovedAt?: string;
  technicalApproved: boolean;
  technicalApprovedBy?: string;
  technicalApprovedAt?: string;
  
  // Scheduling
  scheduleSlotId?: string;
  productionOrderIds: string[];
  
  // Revisions
  revisionNumber: number;
  revisionHistory: OrderRevision[];
  
  // Cancellation
  cancellationReason?: string;
  cancellationCharges?: number;
  cancelledBy?: string;
  cancelledAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface OrderRevision {
  id: string;
  orderId: string;
  revisionNumber: number;
  
  // Changes
  changedFields: string[];
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  
  // Reason
  reason: string;
  
  // Approval
  requiresReApproval: boolean;
  reApprovedBy?: string;
  reApprovedAt?: string;
  
  // Metadata
  createdAt: string;
  createdBy: string;
}

// ============================================================================
// Production Scheduling
// ============================================================================

export interface ScheduleSlot {
  id: string;
  plantId: string;
  date: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  
  // Capacity
  allocatedQuantity: number; // m³
  maxCapacity: number; // m³ (plant practical capacity × hours)
  remainingCapacity: number; // m³
  
  // Orders
  orderIds: string[];
  
  // Resources
  mixerIds: string[];
  pumpId?: string;
  
  // Status
  status: 'available' | 'partially_booked' | 'fully_booked' | 'locked';
  
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocation {
  id: string;
  scheduleSlotId: string;
  orderId: string;
  
  // Resource
  resourceType: 'mixer' | 'pump';
  resourceId: string;
  resourceName: string;
  
  // Time
  startTime: string;
  endTime: string;
  
  // Status
  status: 'allocated' | 'in_use' | 'completed' | 'cancelled';
  
  createdAt: string;
}

export interface SchedulingConflict {
  type: 'plant_capacity' | 'mixer_unavailable' | 'pump_unavailable' | 'travel_time';
  message: string;
  alternatives: SchedulingAlternative[];
}

export interface SchedulingAlternative {
  plantId?: string;
  plantName?: string;
  date?: string;
  startTime?: string;
  reason: string;
}

// ============================================================================
// Material Reservation
// ============================================================================

export interface MaterialReservation {
  id: string;
  orderId: string;
  scheduleSlotId: string;
  
  // Material
  materialId: string;
  materialName: string;
  
  // Quantity
  reservedQuantity: number;
  unit: string;
  
  // Status
  status: 'reserved' | 'consumed' | 'released';
  
  // Dates
  reservedAt: string;
  consumedAt?: string;
  releasedAt?: string;
  
  // Reference
  productionOrderId?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Order Notifications
// ============================================================================

export type NotificationType = 
  | 'order_confirmation' 
  | 'schedule_change' 
  | 'delivery_update' 
  | 'order_cancellation';

export interface OrderNotification {
  id: string;
  orderId: string;
  notificationType: NotificationType;
  
  // Recipient
  recipientType: 'customer' | 'site_contact' | 'internal';
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  
  // Channel
  channel: 'email' | 'sms' | 'push';
  
  // Content
  templateId: string;
  templateVariables: Record<string, string>;
  
  // Status
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  errorMessage?: string;
  
  // Consent
  hasConsent: boolean;
  
  createdAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface OrderConfiguration {
  id: string;
  
  // Credit check
  creditCheckEnabled: boolean;
  creditLimitExceedThreshold: number; // percentage
  
  // Technical check
  technicalCheckEnabled: boolean;
  mixDesignApprovalRequired: boolean;
  
  // Scheduling
  schedulingHorizonDays: number;
  travelTimeBufferMinutes: number;
  minimumLeadTimeHours: number;
  
  // Revisions
  quantityRevisionThreshold: number; // percentage
  timeRevisionThreshold: number; // hours
  gradeRevisionRequiresApproval: boolean;
  
  // Notifications
  sendOrderConfirmation: boolean;
  sendScheduleChanges: boolean;
  sendDeliveryUpdates: boolean;
  
  createdAt: string;
  updatedAt: string;
}
