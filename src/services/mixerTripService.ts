/**
 * Part 18 — Transit Mixer Trip Service
 */

import { storage } from './storage';
import { MixerTrip } from './dispatchTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { getAsset, updateAsset } from './assets';
import { getOperator } from './operatorManagement';
import { getDispatch } from './dispatchService';

const tripsStore = storage.getAdapter<MixerTrip>('mixer_trips');

// ============================================================================
// Trip CRUD
// ============================================================================

export async function createMixerTrip(
  data: Omit<MixerTrip, 'id' | 'tripNumber' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<MixerTrip> {
  // Generate trip number
  const tripNumber = `TRIP-${Date.now()}`;
  
  // Validate mixer exists
  const mixer = await getAsset(data.mixerId);
  if (!mixer) {
    throw new Error(`Mixer ${data.mixerId} not found`);
  }
  
  // Validate driver exists
  const driver = await getOperator(data.driverId);
  if (!driver) {
    throw new Error(`Driver ${data.driverId} not found`);
  }
  
  // Validate dispatch exists
  const dispatch = await getDispatch(data.dispatchId);
  if (!dispatch) {
    throw new Error(`Dispatch ${data.dispatchId} not found`);
  }
  
  const trip: MixerTrip = {
    ...data,
    id: generateId(),
    tripNumber,
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await tripsStore.create(trip);
  
  // Update mixer status to deployed
  await updateAsset(data.mixerId, {
    status: 'deployed',
    updatedAt: new Date().toISOString(),
    updatedBy: data.driverId,
  }, data.driverId, generateId());
  
  await recordAudit({
    entityType: 'MixerTrip',
    entityId: trip.id,
    action: 'create',
    before: null,
    after: trip as any,
    actorId: data.driverId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: `Trip ${tripNumber} created for dispatch ${dispatch.dispatchNumber}`,
  });
  
  return trip;
}

export async function getMixerTrip(id: string): Promise<MixerTrip | null> {
  return tripsStore.findById(id);
}

export async function getMixerTripByNumber(tripNumber: string): Promise<MixerTrip | null> {
  const all = await tripsStore.findAll();
  return all.find(t => t.tripNumber === tripNumber) || null;
}

export async function listMixerTrips(filters?: {
  mixerId?: string;
  driverId?: string;
  dispatchId?: string;
  date?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<MixerTrip[]> {
  let trips = await tripsStore.findAll();
  
  if (filters?.mixerId) {
    trips = trips.filter(t => t.mixerId === filters.mixerId);
  }
  if (filters?.driverId) {
    trips = trips.filter(t => t.driverId === filters.driverId);
  }
  if (filters?.dispatchId) {
    trips = trips.filter(t => t.dispatchId === filters.dispatchId);
  }
  if (filters?.date) {
    trips = trips.filter(t => t.date === filters.date);
  }
  if (filters?.status) {
    trips = trips.filter(t => t.status === filters.status);
  }
  if (filters?.fromDate) {
    trips = trips.filter(t => t.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    trips = trips.filter(t => t.date <= filters.toDate!);
  }
  
  return trips.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

// ============================================================================
// Trip Status Updates
// ============================================================================

export async function startTrip(
  tripId: string,
  startOdometer: number,
  userId: string
): Promise<MixerTrip> {
  const trip = await tripsStore.findById(tripId);
  if (!trip) {
    throw new Error(`Trip ${tripId} not found`);
  }
  
  if (trip.status !== 'planned') {
    throw new Error(`Trip is not in planned status (current: ${trip.status})`);
  }
  
  const updated = await tripsStore.update(tripId, {
    status: 'in_progress',
    startOdometer,
    updatedAt: new Date().toISOString(),
  });
  
  await recordAudit({
    entityType: 'MixerTrip',
    entityId: tripId,
    action: 'update',
    before: { status: 'planned', startOdometer: undefined },
    after: { status: 'in_progress', startOdometer },
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Trip started',
  });
  
  return updated;
}

export async function completeTrip(
  tripId: string,
  endOdometer: number,
  drumHours: number,
  fuelConsumed: number,
  userId: string
): Promise<MixerTrip> {
  const trip = await tripsStore.findById(tripId);
  if (!trip) {
    throw new Error(`Trip ${tripId} not found`);
  }
  
  if (trip.status !== 'in_progress') {
    throw new Error(`Trip is not in progress (current: ${trip.status})`);
  }
  
  if (!trip.startOdometer) {
    throw new Error('Trip start odometer not recorded');
  }
  
  const tripKilometres = endOdometer - trip.startOdometer;
  
  const updated = await tripsStore.update(tripId, {
    status: 'completed',
    endTime: new Date().toISOString(),
    endOdometer,
    tripKilometres,
    drumHours,
    fuelConsumed,
    updatedAt: new Date().toISOString(),
  });
  
  // Update mixer status back to available
  await updateAsset(trip.mixerId, {
    status: 'available',
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }, userId, generateId());
  
  await recordAudit({
    entityType: 'MixerTrip',
    entityId: tripId,
    action: 'update',
    before: { status: 'in_progress', endOdometer: undefined },
    after: { status: 'completed', endOdometer, tripKilometres, drumHours, fuelConsumed },
    actorId: userId,
    actorRole: 'operator',
    requestId: generateId(),
    reason: 'Trip completed',
  });
  
  return updated;
}

export async function cancelTrip(
  tripId: string,
  reason: string,
  userId: string
): Promise<MixerTrip> {
  const trip = await tripsStore.findById(tripId);
  if (!trip) {
    throw new Error(`Trip ${tripId} not found`);
  }
  
  if (trip.status === 'completed') {
    throw new Error('Cannot cancel completed trip');
  }
  
  const updated = await tripsStore.update(tripId, {
    status: 'cancelled',
    endTime: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  
  // Update mixer status back to available
  await updateAsset(trip.mixerId, {
    status: 'available',
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  }, userId, generateId());
  
  await recordAudit({
    entityType: 'MixerTrip',
    entityId: tripId,
    action: 'update',
    before: { status: trip.status },
    after: { status: 'cancelled', reason },
    actorId: userId,
    actorRole: 'dispatch_manager',
    requestId: generateId(),
    reason: `Trip cancelled: ${reason}`,
  });
  
  return updated;
}

// ============================================================================
// Trip Statistics
// ============================================================================

export async function getMixerTripStatistics(filters?: {
  mixerId?: string;
  driverId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<{
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalKilometres: number;
  totalDrumHours: number;
  totalFuelConsumed: number;
  averageFuelEfficiency: number; // L/km
}> {
  let trips = await tripsStore.findAll();
  
  if (filters?.mixerId) {
    trips = trips.filter(t => t.mixerId === filters.mixerId);
  }
  if (filters?.driverId) {
    trips = trips.filter(t => t.driverId === filters.driverId);
  }
  if (filters?.fromDate) {
    trips = trips.filter(t => t.date >= filters.fromDate!);
  }
  if (filters?.toDate) {
    trips = trips.filter(t => t.date <= filters.toDate!);
  }
  
  const completedTrips = trips.filter(t => t.status === 'completed');
  const cancelledTrips = trips.filter(t => t.status === 'cancelled');
  
  const totalKilometres = completedTrips.reduce((sum, t) => sum + (t.tripKilometres || 0), 0);
  const totalDrumHours = completedTrips.reduce((sum, t) => sum + (t.drumHours || 0), 0);
  const totalFuelConsumed = completedTrips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0);
  
  const averageFuelEfficiency = totalKilometres > 0 ? totalFuelConsumed / totalKilometres : 0;
  
  return {
    totalTrips: trips.length,
    completedTrips: completedTrips.length,
    cancelledTrips: cancelledTrips.length,
    totalKilometres: Math.round(totalKilometres),
    totalDrumHours: Math.round(totalDrumHours * 10) / 10,
    totalFuelConsumed: Math.round(totalFuelConsumed * 10) / 10,
    averageFuelEfficiency: Math.round(averageFuelEfficiency * 100) / 100,
  };
}

export async function getTripsByDate(date: string): Promise<MixerTrip[]> {
  return listMixerTrips({ date });
}

export async function getTripsByMixer(mixerId: string, fromDate?: string, toDate?: string): Promise<MixerTrip[]> {
  return listMixerTrips({ mixerId, fromDate, toDate });
}

export async function getTripsByDriver(driverId: string, fromDate?: string, toDate?: string): Promise<MixerTrip[]> {
  return listMixerTrips({ driverId, fromDate, toDate });
}
