/**
 * Part 18 — Dispatch Configuration Service
 */

import { storage } from './storage';
import { DispatchConfiguration } from './dispatchTypes';
import { generateId } from './utils';

const configStore = storage.getAdapter<DispatchConfiguration>('dispatch_configurations');

export async function getDispatchConfiguration(): Promise<DispatchConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    // Return default configuration
    const defaultConfig: DispatchConfiguration = {
      id: 'default',
      maxLoadingTimeMinutes: 30,
      maxTransitTimeMinutes: 120,
      maxSiteWaitingMinutes: 60,
      maxConcreteAgeMinutes: 120,
      overloadTolerancePercent: 5,
      raiseDelayAlert: true,
      raiseWaitingAlert: true,
      raiseConcreteAgeAlert: true,
      requireSignature: true,
      requireOTP: false,
      requirePhoto: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(defaultConfig);
    return defaultConfig;
  }
  return configs[0];
}

export async function updateDispatchConfiguration(
  updates: Partial<DispatchConfiguration>
): Promise<DispatchConfiguration> {
  const configs = await configStore.findAll();
  if (configs.length === 0) {
    const config: DispatchConfiguration = {
      id: generateId(),
      maxLoadingTimeMinutes: updates.maxLoadingTimeMinutes ?? 30,
      maxTransitTimeMinutes: updates.maxTransitTimeMinutes ?? 120,
      maxSiteWaitingMinutes: updates.maxSiteWaitingMinutes ?? 60,
      maxConcreteAgeMinutes: updates.maxConcreteAgeMinutes ?? 120,
      overloadTolerancePercent: updates.overloadTolerancePercent ?? 5,
      raiseDelayAlert: updates.raiseDelayAlert ?? true,
      raiseWaitingAlert: updates.raiseWaitingAlert ?? true,
      raiseConcreteAgeAlert: updates.raiseConcreteAgeAlert ?? true,
      requireSignature: updates.requireSignature ?? true,
      requireOTP: updates.requireOTP ?? false,
      requirePhoto: updates.requirePhoto ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await configStore.create(config);
    return config;
  }

  const updated = await configStore.update(configs[0].id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  return updated;
}
