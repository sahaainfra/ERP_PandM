/**
 * Part 28 — Attendance Masters Service
 * 
 * Manages shifts, work calendars, and attendance policies
 */

import { storage } from './storage';
import { Shift, WorkCalendar, AttendancePolicy, BreakRule, Holiday } from './attendanceTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';

const shiftsStore = storage.getAdapter<Shift>('shifts');
const calendarsStore = storage.getAdapter<WorkCalendar>('work_calendars');
const policiesStore = storage.getAdapter<AttendancePolicy>('attendance_policies');

// ============================================================================
// Shift Management
// ============================================================================

export async function createShift(
  params: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Shift> {
  const shift: Shift = {
    ...params,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await shiftsStore.create(shift);

  await recordAudit({
    entityType: 'Shift',
    entityId: shift.id,
    action: 'create',
    before: null,
    after: shift as any,
    actorId: 'system',
    actorRole: 'hr_manager',
    requestId: generateId(),
    reason: 'Shift created',
  });

  return shift;
}

export async function getShift(id: string): Promise<Shift | null> {
  return shiftsStore.findById(id);
}

export async function listShifts(filters?: {
  isActive?: boolean;
}): Promise<Shift[]> {
  let shifts = await shiftsStore.findAll();

  if (filters?.isActive !== undefined) {
    shifts = shifts.filter(s => s.isActive === filters.isActive);
  }

  return shifts;
}

export async function updateShift(
  id: string,
  updates: Partial<Shift>,
  userId: string
): Promise<Shift> {
  const shift = await shiftsStore.findById(id);
  if (!shift) {
    throw new Error(`Shift ${id} not found`);
  }

  const updated = await shiftsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'Shift',
    entityId: id,
    action: 'update',
    before: shift as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'hr_manager',
    requestId: generateId(),
    reason: 'Shift updated',
  });

  return updated;
}

export async function addBreakRule(
  shiftId: string,
   Omit<BreakRule, 'id' | 'shiftId'>
): Promise<Shift> {
  const shift = await shiftsStore.findById(shiftId);
  if (!shift) {
    throw new Error(`Shift ${shiftId} not found`);
  }

  const breakRule: BreakRule = {
    ...data,
    id: generateId(),
    shiftId,
  };

  const updated = await shiftsStore.update(shiftId, {
    breakRules: [...shift.breakRules, breakRule],
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

// ============================================================================
// Work Calendar Management
// ============================================================================

export async function createWorkCalendar(
   Omit<WorkCalendar, 'id' | 'createdAt' | 'updatedAt'>
): Promise<WorkCalendar> {
  const calendar: WorkCalendar = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await calendarsStore.create(calendar);

  await recordAudit({
    entityType: 'WorkCalendar',
    entityId: calendar.id,
    action: 'create',
    before: null,
    after: calendar as any,
    actorId: 'system',
    actorRole: 'hr_manager',
    requestId: generateId(),
    reason: 'Work calendar created',
  });

  return calendar;
}

export async function getWorkCalendar(id: string): Promise<WorkCalendar | null> {
  return calendarsStore.findById(id);
}

export async function getWorkCalendarForSite(
  siteId: string,
  year: number
): Promise<WorkCalendar | null> {
  const all = await calendarsStore.findAll();
  return all.find(c => c.siteId === siteId && c.year === year) || null;
}

export async function listWorkCalendars(filters?: {
  siteId?: string;
  officeId?: string;
  year?: number;
  isActive?: boolean;
}): Promise<WorkCalendar[]> {
  let calendars = await calendarsStore.findAll();

  if (filters?.siteId) {
    calendars = calendars.filter(c => c.siteId === filters.siteId);
  }
  if (filters?.officeId) {
    calendars = calendars.filter(c => c.officeId === filters.officeId);
  }
  if (filters?.year) {
    calendars = calendars.filter(c => c.year === filters.year);
  }
  if (filters?.isActive !== undefined) {
    calendars = calendars.filter(c => c.isActive === filters.isActive);
  }

  return calendars;
}

export async function addHoliday(
  calendarId: string,
   Omit<Holiday, 'id' | 'calendarId'>
): Promise<WorkCalendar> {
  const calendar = await calendarsStore.findById(calendarId);
  if (!calendar) {
    throw new Error(`Calendar ${calendarId} not found`);
  }

  const holiday: Holiday = {
    ...data,
    id: generateId(),
    calendarId,
  };

  const updated = await calendarsStore.update(calendarId, {
    holidays: [...calendar.holidays, holiday],
    updatedAt: new Date().toISOString(),
  });

  return updated;
}

export async function isWorkingDay(
  calendarId: string,
  date: string
): Promise<{ isWorking: boolean; dayType: 'working' | 'weekly_off' | 'holiday' }> {
  const calendar = await calendarsStore.findById(calendarId);
  if (!calendar) {
    throw new Error(`Calendar ${calendarId} not found`);
  }

  const checkDate = new Date(date);
  const dayOfWeek = checkDate.getDay();

  // Check if weekly off
  if (calendar.weeklyOffs.includes(dayOfWeek)) {
    return { isWorking: false, dayType: 'weekly_off' };
  }

  // Check if holiday
  const isHoliday = calendar.holidays.some(h => h.date === date);
  if (isHoliday) {
    return { isWorking: false, dayType: 'holiday' };
  }

  return { isWorking: true, dayType: 'working' };
}

// ============================================================================
// Attendance Policy Management
// ============================================================================

export async function createAttendancePolicy(
   Omit<AttendancePolicy, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AttendancePolicy> {
  const policy: AttendancePolicy = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await policiesStore.create(policy);

  await recordAudit({
    entityType: 'AttendancePolicy',
    entityId: policy.id,
    action: 'create',
    before: null,
    after: policy as any,
    actorId: 'system',
    actorRole: 'hr_manager',
    requestId: generateId(),
    reason: 'Attendance policy created',
  });

  return policy;
}

export async function getAttendancePolicy(id: string): Promise<AttendancePolicy | null> {
  return policiesStore.findById(id);
}

export async function getAttendancePolicyForCategory(
  employeeCategory: string
): Promise<AttendancePolicy | null> {
  const all = await policiesStore.findAll();
  return all.find(p => p.employeeCategory === employeeCategory && p.isActive) || null;
}

export async function listAttendancePolicies(filters?: {
  employeeCategory?: string;
  isActive?: boolean;
}): Promise<AttendancePolicy[]> {
  let policies = await policiesStore.findAll();

  if (filters?.employeeCategory) {
    policies = policies.filter(p => p.employeeCategory === filters.employeeCategory);
  }
  if (filters?.isActive !== undefined) {
    policies = policies.filter(p => p.isActive === filters.isActive);
  }

  return policies;
}

export async function updateAttendancePolicy(
  id: string,
  updates: Partial<AttendancePolicy>,
  userId: string
): Promise<AttendancePolicy> {
  const policy = await policiesStore.findById(id);
  if (!policy) {
    throw new Error(`Policy ${id} not found`);
  }

  const updated = await policiesStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'AttendancePolicy',
    entityId: id,
    action: 'update',
    before: policy as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'hr_manager',
    requestId: generateId(),
    reason: 'Attendance policy updated',
  });

  return updated;
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultAttendanceMasters(): Promise<void> {
  const existingShifts = await shiftsStore.findAll();
  if (existingShifts.length > 0) return;

  // Default shifts
  const shifts = [
    {
      name: 'Morning Shift',
      startTime: '09:00',
      endTime: '18:00',
      graceMinutes: 15,
      breakRules: [
        {
          id: generateId(),
          shiftId: '',
          startTime: '13:00',
          endTime: '14:00',
          durationMinutes: 60,
          isPaid: false,
        },
      ],
      minHoursForFullDay: 8,
      minHoursForHalfDay: 4,
      isNightShift: false,
      nightShiftDateRule: 'start_date' as const,
      isActive: true,
    },
    {
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      graceMinutes: 15,
      breakRules: [
        {
          id: generateId(),
          shiftId: '',
          startTime: '01:00',
          endTime: '02:00',
          durationMinutes: 60,
          isPaid: false,
        },
      ],
      minHoursForFullDay: 8,
      minHoursForHalfDay: 4,
      isNightShift: true,
      nightShiftDateRule: 'start_date' as const,
      isActive: true,
    },
  ];

  for (const shift of shifts) {
    await createShift(shift);
  }

  // Default policies
  const policies = [
    {
      name: 'Staff Policy',
      employeeCategory: 'staff',
      overtimeEligible: false,
      overtimeThresholdHours: 9,
      overtimeRate: 1.5,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 15,
      roundingMinutes: 15,
      roundingDirection: 'nearest' as const,
      sourceReference: 'Company HR Policy Manual v2.1',
      sourceVerifiedAt: new Date().toISOString(),
      isActive: true,
    },
    {
      name: 'Operator Policy',
      employeeCategory: 'operator',
      overtimeEligible: true,
      overtimeThresholdHours: 8,
      overtimeRate: 2.0,
      lateThresholdMinutes: 30,
      earlyDepartureThresholdMinutes: 30,
      roundingMinutes: 30,
      roundingDirection: 'nearest' as const,
      sourceReference: 'Factories Act 1948, Section 59',
      sourceVerifiedAt: new Date().toISOString(),
      isActive: true,
    },
  ];

  for (const policy of policies) {
    await createAttendancePolicy(policy);
  }
}
