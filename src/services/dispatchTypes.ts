/**
 * Part 18 — Dispatch and Delivery Types
 */

import { Status } from './types';

// ============================================================================
// Dispatch Workflow
// ============================================================================

export type DispatchStatus = 
  | 'scheduled'
  | 'loading'
  | 'loaded'
  | 'in_transit'
  | 'at_site'
  | 'unloading'
  | 'completed'
  | 'returned'
  | 'rejected'
  | 'cancelled';

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  
  // Order link
  orderId: string;
  orderNumber: string;
  
  // Batch link
  batchId: string;
  batchNumber: string;
  
  // Plant
  plantId: string;
  plantName: string;
  
  // Vehicle and driver
  mixerId: string;
  mixerNumber: string;
  driverId: string;
  driverName: string;
  driverLicenceNumber: string;
  
  // Pump (if required)
  pumpId?: string;
  pumpNumber?: string;
  pumpOperatorId?: string;
  
  // Delivery site
  deliverySiteName: string;
  deliverySiteAddress: string;
  deliverySiteCoordinates?: { lat: number; lng: number };
  siteContactName?: string;
  siteContactPhone?: string;
  
  // Product details
  grade: string;
  mixDesignId: string;
  mixDesignRevision: number;
  
  // Quantities
  dispatchedQuantity: number; // m³
  deliveredQuantity?: number; // m³
  returnedQuantity?: number; // m³
  rejectedQuantity?: number; // m³
  wastedQuantity?: number; // m³
  
  // Challan
  challanNumber: string;
  challanGeneratedAt: string;
  sealNumber?: string;
  
  // Timestamps
  scheduledLoadingTime: string;
  loadingStartTime?: string;
  loadingEndTime?: string;
  plantDepartureTime?: string;
  siteArrivalTime?: string;
  unloadingStartTime?: string;
  unloadingEndTime?: string;
  siteDepartureTime?: string;
  plantReturnTime?: string;
  
  // Source labels for timestamps
  timestampSources: Record<string, 'manual' | 'gps' | 'driver_app'>;
  
  // Transit tracking
  expectedTransitMinutes: number;
  actualTransitMinutes?: number;
  transitDistance?: number; // km
  
  // Site receipt
  receiverName?: string;
  receiverSignature?: string; // Attachment ID
  receiverOTP?: string;
  receiverPhoto?: string; // Attachment ID
  receiptConfirmedAt?: string;
  
  // Status
  status: DispatchStatus;
  
  // Exceptions
  hasDelay: boolean;
  delayReason?: string;
  siteWaitingMinutes?: number;
  concreteAgeAtUnloading?: number; // minutes
  concreteAgeExceeded: boolean;
  
  // Returns/Rejections
  returnReason?: string;
  rejectionReason?: string;
  qcReportId?: string; // Link to Part 16
  disposition?: 'reuse' | 'waste' | 'other';
  dispositionApprovedBy?: string;
  dispositionApprovedAt?: string;
  
  // Costs (for Part 21)
  fuelCost?: number;
  driverCost?: number;
  maintenanceCost?: number;
  tollCost?: number;
  pumpCost?: number;
  totalTransportCost?: number;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Transit Mixer Trip
// ============================================================================

export interface MixerTrip {
  id: string;
  tripNumber: string;
  
  // Mixer
  mixerId: string;
  mixerNumber: string;
  drumCapacity: number; // m³
  
  // Driver
  driverId: string;
  driverName: string;
  
  // Trip details
  date: string;
  startTime: string;
  endTime?: string;
  
  // Route
  plantId: string;
  plantName: string;
  deliverySiteName: string;
  deliverySiteAddress: string;
  
  // Load
  loadQuantity: number; // m³
  batchId: string;
  batchNumber: string;
  
  // Dispatch link
  dispatchId: string;
  
  // Kilometres and hours (for logbook)
  startOdometer?: number;
  endOdometer?: number;
  tripKilometres?: number;
  drumHours?: number;
  
  // Fuel
  fuelConsumed?: number; // litres
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Concrete Pump Booking
// ============================================================================

export type PumpBookingStatus = 'booked' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface PumpBooking {
  id: string;
  bookingNumber: string;
  
  // Pump
  pumpId: string;
  pumpNumber: string;
  pumpType: 'boom' | 'line' | 'static';
  boomLength?: number; // meters
  
  // Operator
  operatorId: string;
  operatorName: string;
  
  // Order link
  orderId: string;
  orderNumber: string;
  
  // Site
  siteName: string;
  siteAddress: string;
  
  // Schedule
  bookingDate: string;
  startTime: string;
  endTime: string;
  
  // Actual times
  actualStartTime?: string;
  actualEndTime?: string;
  
  // Pumping details
  pumpingHours?: number;
  quantityPumped?: number; // m³
  lineLength?: number; // meters
  boomUsed?: number; // meters
  
  // Dispatches served
  dispatchIds: string[];
  
  // Costs
  deploymentCost?: number;
  pumpingCharges?: number;
  totalCost?: number;
  
  // Status
  status: PumpBookingStatus;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Delivery Challan
// ============================================================================

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  
  // Order
  orderId: string;
  orderNumber: string;
  
  // Plant
  plantId: string;
  plantName: string;
  
  // Dispatches
  dispatchIds: string[];
  
  // Summary
  totalQuantity: number; // m³
  batchNumbers: string[];
  grade: string;
  mixDesignCode: string;
  
  // Vehicle
  mixerNumber: string;
  driverName: string;
  driverLicenceNumber: string;
  
  // Site
  siteName: string;
  siteAddress: string;
  
  // Timestamps
  generatedAt: string;
  printedAt?: string;
  
  // PDF
  pdfAttachmentId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Batch Ticket
// ============================================================================

export interface BatchTicket {
  id: string;
  ticketNumber: string;
  
  // Batch
  batchId: string;
  batchNumber: string;
  
  // Plant
  plantId: string;
  plantName: string;
  
  // Product
  grade: string;
  mixDesignCode: string;
  mixDesignRevision: number;
  
  // Quantity
  volume: number; // m³
  
  // Timestamps
  batchingStartTime: string;
  batchingEndTime: string;
  ticketGeneratedAt: string;
  
  // Operator
  operatorName: string;
  
  // PDF
  pdfAttachmentId?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Exception Detection
// ============================================================================

export type ExceptionType = 
  | 'DISPATCH_DELAY'
  | 'TRANSIT_DELAY'
  | 'SITE_WAITING_EXCESS'
  | 'CONCRETE_AGE_LIMIT'
  | 'OVERLOAD_ATTEMPT'
  | 'SAFETY_HOLD_VIOLATION'
  | 'INVALID_LICENCE';

export interface DispatchException {
  id: string;
  dispatchId: string;
  
  // Exception details
  exceptionType: ExceptionType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  
  // Thresholds
  thresholdValue?: number;
  actualValue?: number;
  unit?: string;
  
  // Status
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolutionNotes?: string;
  
  // Alert
  alertRaised: boolean;
  alertId?: string;
  
  // Metadata
  detectedAt: string;
  createdAt: string;
}

// ============================================================================
// Driver Mobile Events
// ============================================================================

export type DriverEventType = 
  | 'trip_started'
  | 'loading_started'
  | 'loading_completed'
  | 'departed_plant'
  | 'arrived_site'
  | 'unloading_started'
  | 'unloading_completed'
  | 'departed_site'
  | 'returned_plant'
  | 'receipt_confirmed'
  | 'issue_reported';

export interface DriverEvent {
  id: string;
  clientUuid: string; // For offline sync
  idempotencyKey: string;
  
  // Event
  eventType: DriverEventType;
  dispatchId: string;
  tripId: string;
  
  // Timestamps
  clientCaptureTime: string; // When driver captured
  serverReceiptTime?: string; // When server received
  
  // Location
  gpsCoordinates?: { lat: number; lng: number };
  gpsAccuracy?: number;
  
  // Source
  source: 'driver_app' | 'gps' | 'manual';
  
  // Additional data
  notes?: string;
  photoAttachmentId?: string;
  
  // Sync status
  syncStatus: 'pending' | 'synced' | 'failed';
  syncError?: string;
  
  // Offline
  isOffline: boolean;
  
  createdAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DispatchConfiguration {
  id: string;
  
  // Timing
  maxLoadingTimeMinutes: number;
  maxTransitTimeMinutes: number;
  maxSiteWaitingMinutes: number;
  maxConcreteAgeMinutes: number;
  
  // Capacity
  overloadTolerancePercent: number;
  
  // Alerts
  raiseDelayAlert: boolean;
  raiseWaitingAlert: boolean;
  raiseConcreteAgeAlert: boolean;
  
  // Receipt
  requireSignature: boolean;
  requireOTP: boolean;
  requirePhoto: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Reports and KPIs
// ============================================================================

export interface DispatchReport {
  date: string;
  plantId?: string;
  
  // Summary
  totalDispatches: number;
  completedDispatches: number;
  returnedDispatches: number;
  rejectedDispatches: number;
  
  // Quantities
  totalDispatched: number; // m³
  totalDelivered: number; // m³
  totalReturned: number; // m³
  totalRejected: number; // m³
  
  // Timing
  averageLoadingTime: number; // minutes
  averageTransitTime: number; // minutes
  averageSiteWaitingTime: number; // minutes
  averageUnloadingTime: number; // minutes
  
  // Performance
  onTimeDeliveryPercent: number;
  averageDeliveryCycleTime: number; // minutes
  
  // Exceptions
  delayCount: number;
  waitingExcessCount: number;
  concreteAgeExceededCount: number;
  
  // Costs
  totalTransportCost: number;
  averageCostPerM3: number;
}

export interface MixerUtilizationReport {
  mixerId: string;
  mixerNumber: string;
  date: string;
  
  // Trips
  totalTrips: number;
  completedTrips: number;
  
  // Hours
  totalHours: number;
  productiveHours: number;
  idleHours: number;
  
  // Distance
  totalKilometres: number;
  
  // Fuel
  totalFuelConsumed: number; // litres
  fuelEfficiency: number; // L/km or L/hr
  
  // Utilization
  utilizationPercent: number;
}

export interface PumpUtilizationReport {
  pumpId: string;
  pumpNumber: string;
  date: string;
  
  // Bookings
  totalBookings: number;
  completedBookings: number;
  
  // Hours
  totalHours: number;
  pumpingHours: number;
  
  // Quantity
  totalQuantityPumped: number; // m³
  
  // Utilization
  utilizationPercent: number;
  
  // Revenue
  totalCharges: number;
}
