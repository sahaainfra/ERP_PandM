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
  | 'delivered'
  | 'returned'
  | 'rejected'
  | 'cancelled';

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  
  // Links
  orderId: string;
  orderNumber: string;
  batchId: string;
  batchNumber: string;
  productionOrderId?: string;
  
  // Transit mixer
  mixerId: string;
  mixerNumber: string;
  driverId: string;
  driverName: string;
  
  // Pump (if required)
  pumpId?: string;
  pumpNumber?: string;
  pumpOperatorId?: string;
  
  // Delivery site
  siteName: string;
  siteAddress: string;
  siteContactName?: string;
  siteContactPhone?: string;
  siteCoordinates?: { lat: number; lng: number };
  
  // Quantity
  dispatchedQuantity: number; // m³
  deliveredQuantity?: number; // m³
  returnedQuantity?: number; // m³
  rejectedQuantity?: number; // m³
  wastedQuantity?: number; // m³
  
  // Timestamps
  scheduledTime: string;
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
  
  // Batch ticket and challan
  batchTicketId?: string;
  batchTicketNumber?: string;
  challanId?: string;
  challanNumber?: string;
  sealNumber?: string;
  
  // Site receipt
  receiverName?: string;
  receiptMethod?: 'signature' | 'otp' | 'photo';
  receiptEvidenceId?: string; // Attachment ID
  receiptTime?: string;
  
  // Status
  status: DispatchStatus;
  
  // Exceptions
  delayDetected: boolean;
  delayReason?: string;
  concreteAgeAtUnloading?: number; // minutes
  ageLimitExceeded: boolean;
  
  // Returns/Rejections
  returnReason?: string;
  rejectionReason?: string;
  rejectionQcLinkId?: string; // Link to Part 16 NCR
  returnDisposition?: 'reuse' | 'waste' | 'other';
  returnDispositionApprovedBy?: string;
  returnDispositionApprovedAt?: string;
  
  // Trip log
  tripLogId?: string;
  
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
  
  // Batch details
  batchId: string;
  batchNumber: string;
  plantId: string;
  plantName: string;
  
  // Mix design
  grade: string;
  mixDesignId: string;
  mixDesignRevision: number;
  
  // Quantity
  quantity: number; // m³
  
  // Timestamps
  batchingTime: string;
  ticketGeneratedAt: string;
  
  // Vehicle and driver
  mixerId: string;
  mixerNumber: string;
  driverId: string;
  driverName: string;
  
  // Seal
  sealNumber?: string;
  
  // Delivery site
  siteName: string;
  siteAddress: string;
  
  // Order reference
  orderId: string;
  orderNumber: string;
  
  // PDF
  pdfAttachmentId?: string;
  
  createdAt: string;
}

// ============================================================================
// Delivery Challan
// ============================================================================

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  
  // Links
  dispatchId: string;
  orderId: string;
  orderNumber: string;
  
  // Customer/Project
  customerId?: string;
  customerName?: string;
  projectId?: string;
  projectName?: string;
  
  // Delivery details
  siteName: string;
  siteAddress: string;
  
  // Product details
  grade: string;
  mixDesignCode: string;
  quantity: number; // m³
  ratePerM3: number;
  totalAmount: number;
  
  // Batch references
  batchNumbers: string[];
  
  // Vehicle and driver
  mixerNumber: string;
  driverName: string;
  
  // Timestamps
  challanDate: string;
  plantDepartureTime: string;
  siteArrivalTime?: string;
  
  // Receipt
  receiverName?: string;
  receiptTime?: string;
  receiptMethod?: string;
  
  // PDF
  pdfAttachmentId?: string;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Transit Mixer
// ============================================================================

export interface TransitMixerStatus {
  mixerId: string;
  mixerNumber: string;
  
  // Current status
  availabilityStatus: 'available' | 'on_trip' | 'maintenance' | 'safety_hold' | 'out_of_service';
  
  // Current trip
  currentDispatchId?: string;
  currentTripStatus?: DispatchStatus;
  
  // Driver
  currentDriverId?: string;
  currentDriverName?: string;
  driverLicenceValid: boolean;
  
  // Documents
  mandatoryDocumentsValid: boolean;
  expiredDocuments: string[];
  
  // Maintenance
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  
  // Location (from GPS)
  lastKnownLocation?: { lat: number; lng: number };
  lastLocationUpdate?: string;
  
  // Trip statistics (today)
  tripsCompletedToday: number;
  totalDistanceToday: number; // km
  totalDrumHoursToday: number;
  
  updatedAt: string;
}

// ============================================================================
// Trip Log
// ============================================================================

export interface TripLog {
  id: string;
  tripNumber: string;
  
  // Links
  dispatchId: string;
  mixerId: string;
  driverId: string;
  
  // Route
  plantId: string;
  plantLocation: { lat: number; lng: number };
  siteId?: string;
  siteLocation?: { lat: number; lng: number };
  
  // Distances and times
  plannedDistance: number; // km
  actualDistance: number; // km
  plannedDuration: number; // minutes
  actualDuration: number; // minutes
  
  // Drum operation
  drumStartTime: string;
  drumEndTime: string;
  drumHours: number;
  
  // Fuel
  fuelConsumed: number; // litres
  fuelCost: number;
  
  // Costs
  driverCost: number;
  maintenanceCost: number;
  tollCost: number;
  totalCost: number;
  
  // GPS track
  gpsTrackPoints: GpsTrackPoint[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface GpsTrackPoint {
  timestamp: string;
  latitude: number;
  longitude: number;
  speed?: number; // km/h
  heading?: number; // degrees
}

// ============================================================================
// Concrete Pump
// ============================================================================

export interface PumpBooking {
  id: string;
  bookingNumber: string;
  
  // Links
  orderId: string;
  dispatchId?: string;
  
  // Pump details
  pumpId: string;
  pumpNumber: string;
  pumpType: 'boom' | 'line' | 'static';
  boomLength?: number; // meters
  
  // Operator
  operatorId: string;
  operatorName: string;
  
  // Schedule
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  
  // Site
  siteName: string;
  siteAddress: string;
  
  // Actual times
  actualStartTime?: string;
  actualEndTime?: string;
  pumpingHours?: number;
  
  // Quantity
  quantityPumped?: number; // m³
  
  // Deployment details
  lineLength?: number; // meters
  boomUsed?: number; // meters
  
  // Costs
  deploymentCost: number;
  pumpingCharges: number;
  totalCost: number;
  
  // Status
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// Exceptions and Delays
// ============================================================================

export interface DispatchException {
  id: string;
  dispatchId: string;
  
  // Exception type
  type: 'delay' | 'waiting_excess' | 'concrete_age' | 'rejection' | 'return';
  code: string; // e.g., 'DISPATCH_DELAY', 'SITE_WAITING_EXCESS', 'CONCRETE_AGE_LIMIT'
  
  // Details
  description: string;
  severity: 'info' | 'warning' | 'critical';
  
  // Metrics
  expectedValue?: number;
  actualValue?: number;
  thresholdValue?: number;
  unit?: string;
  
  // Detection
  detectedAt: string;
  detectedBy: string; // 'system' | 'driver' | 'site_receiver' | 'qc_manager'
  
  // Resolution
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  
  // Alert
  alertRaised: boolean;
  alertId?: string;
  
  createdAt: string;
}

// ============================================================================
// Driver Mobile App
// ============================================================================

export interface DriverTripAssignment {
  dispatchId: string;
  dispatchNumber: string;
  orderNumber: string;
  
  // Site
  siteName: string;
  siteAddress: string;
  siteContactName?: string;
  siteContactPhone?: string;
  siteCoordinates?: { lat: number; lng: number };
  
  // Product
  grade: string;
  quantity: number; // m³
  
  // Schedule
  scheduledTime: string;
  
  // Status
  currentStatus: DispatchStatus;
  
  // Actions available
  canStartLoading: boolean;
  canDepartPlant: boolean;
  canArriveSite: boolean;
  canStartUnloading: boolean;
  canCompleteDelivery: boolean;
  
  // Challan
  challanNumber?: string;
  challanPdfUrl?: string;
}

export interface DriverAction {
  dispatchId: string;
  action: 'start_loading' | 'depart_plant' | 'arrive_site' | 'start_unloading' | 'complete_delivery' | 'report_issue';
  
  // Timestamp
  timestamp: string;
  source: 'manual' | 'gps' | 'driver_app';
  
  // Location (if GPS)
  location?: { lat: number; lng: number };
  
  // Evidence (if photo/signature)
  evidenceId?: string;
  
  // Issue details (if reporting)
  issueType?: string;
  issueDescription?: string;
  issuePhotoId?: string;
}

// ============================================================================
// Site Receiver
// ============================================================================

export interface SiteReceiverView {
  expectedDeliveries: ExpectedDelivery[];
}

export interface ExpectedDelivery {
  dispatchId: string;
  dispatchNumber: string;
  orderNumber: string;
  
  // Product
  grade: string;
  quantity: number; // m³
  
  // Schedule
  scheduledTime: string;
  estimatedArrival?: string;
  
  // Vehicle
  mixerNumber: string;
  driverName: string;
  
  // Status
  currentStatus: DispatchStatus;
  
  // Actions
  canConfirmReceipt: boolean;
  canReportIssue: boolean;
}

export interface SiteReceiptConfirmation {
  dispatchId: string;
  
  // Receiver
  receiverName: string;
  
  // Quantity
  acceptedQuantity: number; // m³
  rejectedQuantity?: number; // m³
  
  // Receipt method
  receiptMethod: 'signature' | 'otp' | 'photo';
  signatureAttachmentId?: string;
  otpCode?: string;
  photoAttachmentId?: string;
  
  // Issues
  issues?: string;
  
  // Timestamp
  receiptTime: string;
}

// ============================================================================
// Reports and KPIs
// ============================================================================

export interface DispatchReport {
  date: string;
  plantId: string;
  
  // Summary
  totalDispatches: number;
  totalQuantity: number; // m³
  completedDeliveries: number;
  returnedDeliveries: number;
  rejectedDeliveries: number;
  
  // Timing
  averageLoadingTime: number; // minutes
  averageTransitTime: number; // minutes
  averageWaitingTime: number; // minutes
  averageUnloadingTime: number; // minutes
  averageCycleTime: number; // minutes (total)
  
  // Performance
  onTimeDeliveryPercent: number;
  delayCount: number;
  averageDelayMinutes: number;
  
  // Mixer utilization
  mixerUtilization: MixerUtilization[];
  
  // Pump utilization
  pumpUtilization: PumpUtilization[];
  
  // Costs
  totalTransportCost: number;
  averageCostPerM3: number;
}

export interface MixerUtilization {
  mixerId: string;
  mixerNumber: string;
  tripsCompleted: number;
  totalDistance: number; // km
  totalDrumHours: number;
  utilizationPercent: number;
}

export interface PumpUtilization {
  pumpId: string;
  pumpNumber: string;
  bookingsCompleted: number;
  totalPumpingHours: number;
  totalQuantityPumped: number; // m³
  utilizationPercent: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface DispatchConfiguration {
  id: string;
  
  // Timing
  maxLoadingTimeMinutes: number;
  maxTransitTimeMinutes: number;
  maxSiteWaitingTimeMinutes: number;
  maxUnloadingTimeMinutes: number;
  
  // Concrete age
  maxConcreteAgeMinutes: number;
  concreteAgeSourceStandard?: string;
  
  // Capacity
  overloadTolerancePercent: number;
  
  // Alerts
  dispatchDelayAlertEnabled: boolean;
  siteWaitingExcessAlertEnabled: boolean;
  concreteAgeLimitAlertEnabled: boolean;
  
  // Receipt
  requireSiteReceipt: boolean;
  receiptMethods: ('signature' | 'otp' | 'photo')[];
  
  createdAt: string;
  updatedAt: string;
}
