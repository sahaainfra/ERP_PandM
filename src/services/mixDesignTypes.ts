/**
 * Part 14 — Mix Design Types
 */

import { Status } from './types';

// ============================================================================
// Mix Design Master
// ============================================================================

export type ConcreteGrade = 'M15' | 'M20' | 'M25' | 'M30' | 'M35' | 'M40' | 'M45' | 'M50' | 'M55' | 'M60';
export type ExposureCondition = 'mild' | 'moderate' | 'severe' | 'very_severe' | 'extreme';
export type MixDesignType = 'standard' | 'pumpable' | 'self_compacting' | 'high_early_strength' | 'other';

export interface MixDesign {
  id: string;
  mixDesignCode: string;
  name: string;
  
  // Basic properties
  grade: ConcreteGrade;
  exposureCondition: ExposureCondition;
  type: MixDesignType;
  maxAggregateSize: number; // mm
  targetSlump: number; // mm
  targetFlow?: number; // mm (for self-compacting)
  targetMeanStrength: number; // MPa
  
  // Applicability
  applicablePlantIds: string[];
  customerRestriction?: string; // Customer name if project-specific
  projectRestriction?: string; // Project name if project-specific
  
  // Ingredients per m³
  ingredients: MixDesignIngredient[];
  
  // Derived parameters (calculated)
  totalBinder: number; // kg/m³
  waterBinderRatio: number;
  scmReplacementPercent: number; // %
  theoreticalDensity: number; // kg/m³
  
  // Standards and specifications
  referenceStandards: ReferenceStandard[];
  contractSpecifications?: string[];
  
  // Status and revisions
  currentRevision: number;
  status: 'draft' | 'under_trial' | 'approved' | 'suspended' | 'superseded' | 'withdrawn';
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface MixDesignIngredient {
  id: string;
  mixDesignId: string;
  
  // Ingredient type
  category: 'cement' | 'fly_ash' | 'ggbs' | 'silica_fume' | 'fine_aggregate' | 'coarse_aggregate' | 'water' | 'admixture' | 'fibre' | 'other';
  
  // Specific details
  name: string;
  type?: string; // e.g., 'OPC 53 grade', 'Zone II sand', '20mm aggregate'
  source?: string; // Supplier or source location
  productCode?: string; // For admixtures
  
  // Quantity
  quantity: number;
  unit: 'kg/m³' | 'litres/m³' | 'g/m³' | '% of binder';
  
  // Additional properties
  dosage?: number; // For admixtures (% of binder)
  zone?: string; // For fine aggregate (Zone I, II, III, IV)
  sizeFraction?: number; // For coarse aggregate (mm)
  
  // Metadata
  createdAt: string;
}

export interface ReferenceStandard {
  id: string;
  mixDesignId: string;
  
  standardCode: string; // e.g., 'IS 10262:2019', 'IS 456:2000'
  standardName: string;
  applicableClause?: string;
  
  // Verification
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  
  // Effective date
  effectiveFrom: string;
  effectiveTo?: string;
  
  createdAt: string;
}

// ============================================================================
// Mix Design Revision
// ============================================================================

export interface MixDesignRevision {
  id: string;
  mixDesignId: string;
  revisionNumber: number;
  
  // Changes
  changeSummary: string;
  changedFields: string[]; // List of changed field names
  
  // Ingredients snapshot
  ingredients: MixDesignIngredient[];
  
  // Derived parameters snapshot
  totalBinder: number;
  waterBinderRatio: number;
  scmReplacementPercent: number;
  theoreticalDensity: number;
  
  // Effective date
  effectiveFrom: string;
  effectiveTo?: string; // When superseded by next revision
  
  // Approval workflow
  status: 'draft' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'superseded';
  
  // Drafted by QC
  draftedBy: string;
  draftedAt: string;
  
  // Reviewed by QC Manager
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  
  // Approved by Technical Authority
  approvedBy?: string;
  approvedAt?: string;
  approvalNotes?: string;
  
  // Customer/Consultant approval (if required)
  customerApprovalReference?: string;
  customerApprovalDocumentId?: string;
  customerApprovedAt?: string;
  
  // Reason for change
  reason: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Trial Records
// ============================================================================

export interface MixDesignTrial {
  id: string;
  trialNumber: string;
  mixDesignId: string;
  revisionNumber: number;
  
  // Trial details
  trialDate: string;
  plantId?: string;
  labId?: string;
  
  // Materials used
  materialLots: TrialMaterialLot[];
  
  // Fresh properties
  freshProperties: FreshProperties;
  
  // Hardened properties (cube results)
  cubeResults: CubeResult[];
  
  // Status
  status: 'planned' | 'in_progress' | 'completed' | 'failed';
  
  // Notes
  observations?: string;
  failures?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface TrialMaterialLot {
  id: string;
  trialId: string;
  
  ingredientId: string;
  ingredientName: string;
  
  lotNumber: string;
  supplier: string;
  quantityUsed: number;
  unit: string;
  
  // Material test certificates
  testCertificateId?: string;
  
  createdAt: string;
}

export interface FreshProperties {
  slump?: number; // mm
  flow?: number; // mm (for self-compacting)
  temperature?: number; // °C
  density?: number; // kg/m³
  airContent?: number; // %
  
  // Test method
  testMethod?: string;
  testedBy?: string;
  testedAt?: string;
}

export interface CubeResult {
  id: string;
  trialId: string;
  
  // Test details
  testAge: number; // days (3, 7, 28, etc.)
  testDate: string;
  
  // Results
  cubeSize: number; // mm (150 or 100)
  numberOfCubes: number;
  individualStrengths: number[]; // MPa for each cube
  averageStrength: number; // MPa
  
  // Target
  targetStrength: number; // MPa
  pass: boolean;
  
  // Lab details
  labId?: string;
  labName?: string;
  testedBy?: string;
  
  // Certificate
  certificateId?: string;
  
  createdAt: string;
}

// ============================================================================
// Moisture Correction
// ============================================================================

export interface AggregateMoistureData {
  id: string;
  
  // Aggregate identification
  aggregateType: 'fine_aggregate' | 'coarse_aggregate';
  aggregateName: string;
  source?: string;
  
  // Test results
  testDate: string;
  moistureContent: number; // % (free moisture)
  absorption: number; // % (water absorption)
  
  // Test method
  testMethod?: string;
  testedBy?: string;
  
  // Validity
  validUntil: string;
  isStale: boolean;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface MoistureCorrectionResult {
  ingredientId: string;
  ingredientName: string;
  
  // Nominal (design) values
  nominalWeight: number; // kg
  nominalMoisture: number; // %
  
  // Actual (corrected) values
  actualMoisture: number; // %
  actualAbsorption: number; // %
  
  // Corrections
  moistureAdjustment: number; // kg (positive = add water, negative = reduce water)
  correctedWeight: number; // kg (adjusted aggregate weight)
  
  // Water adjustment
  waterReduction: number; // kg (reduction in mixing water)
  
  // Metadata
  moistureDataId: string;
  moistureDataDate: string;
}

export interface CorrectedBatchWeights {
  batchId: string;
  
  // Original batch weights
  originalIngredients: Array<{
    ingredientId: string;
    ingredientName: string;
    originalWeight: number;
  }>;
  
  // Corrections
  corrections: MoistureCorrectionResult[];
  
  // Summary
  totalWaterReduction: number; // kg
  totalAggregateAdjustment: number; // kg
  
  // Corrected batch totals
  correctedWaterWeight: number; // kg
  correctedBatchWeight: number; // kg
  
  // Metadata
  calculatedAt: string;
  moistureDataAge: number; // hours
}

// ============================================================================
// Mix Design Cost
// ============================================================================

export interface MixDesignCost {
  mixDesignId: string;
  revisionNumber: number;
  
  // Cost per m³
  materialCostPerM3: number; // ₹/m³
  
  // Breakdown by ingredient
  ingredientCosts: Array<{
    ingredientId: string;
    ingredientName: string;
    quantity: number;
    unit: string;
    unitCost: number; // ₹ per unit
    totalCost: number; // ₹
  }>;
  
  // Metadata
  calculatedAt: string;
  materialCostDate: string; // Date of material costs
}

// ============================================================================
// Theoretical Material Requirements
// ============================================================================

export interface TheoreticalMaterialRequirement {
  productionOrderId?: string;
  batchId?: string;
  mixDesignId: string;
  revisionNumber: number;
  
  // Volume
  volume: number; // m³
  
  // Material requirements
  materials: Array<{
    ingredientId: string;
    ingredientName: string;
    category: string;
    quantityPerM3: number;
    unit: string;
    totalQuantity: number;
  }>;
  
  // Totals
  totalBinder: number; // kg
  totalWater: number; // litres
  totalAggregate: number; // kg
  
  // Metadata
  calculatedAt: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface MixDesignConfiguration {
  id: string;
  
  // Moisture data validity
  moistureDataMaxAgeHours: number; // e.g., 24 hours
  
  // Approval workflow
  requireCustomerApproval: boolean;
  requireTechnicalAuthorityApproval: boolean;
  
  // Validation limits
  minWaterBinderRatio: number;
  maxWaterBinderRatio: number;
  minCementContent: number; // kg/m³
  maxCementContent: number; // kg/m³
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}
