/**
 * Part 12 — Integration Framework Service
 */

import { storage } from './storage';
import { 
  IntegrationConnector, 
  IntegrationEvent, 
  IntegrationHealthCheck,
  ConnectorStatus,
  DataSource,
  InboundPattern
} from './integrationTypes';
import { generateId } from './utils';
import { recordAudit } from './audit';
import { raiseAlert } from './alerts';

const connectorsStore = storage.getAdapter<IntegrationConnector>('integration_connectors');
const eventsStore = storage.getAdapter<IntegrationEvent>('integration_events');
const healthChecksStore = storage.getAdapter<IntegrationHealthCheck>('integration_health_checks');

// ============================================================================
// Connector Management
// ============================================================================

export async function createConnector(
  inputData: Omit<IntegrationConnector, 'id' | 'createdAt' | 'updatedAt'>
): Promise<IntegrationConnector> {
  const connector: IntegrationConnector = {
    ...inputData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await connectorsStore.create(connector);

  await recordAudit({
    entityType: 'IntegrationConnector',
    entityId: connector.id,
    action: 'create',
    before: null,
    after: connector as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Integration connector created',
  });

  return connector;
}

export async function getConnector(id: string): Promise<IntegrationConnector | null> {
  return connectorsStore.findById(id);
}

export async function getConnectorBySystem(system: string, provider: string): Promise<IntegrationConnector | null> {
  const all = await connectorsStore.findAll();
  return all.find(c => c.system === system && c.provider === provider) || null;
}

export async function listConnectors(filters?: {
  system?: string;
  provider?: string;
  status?: ConnectorStatus;
  environment?: string;
}): Promise<IntegrationConnector[]> {
  let connectors = await connectorsStore.findAll();

  if (filters?.system) {
    connectors = connectors.filter(c => c.system === filters.system);
  }
  if (filters?.provider) {
    connectors = connectors.filter(c => c.provider === filters.provider);
  }
  if (filters?.status) {
    connectors = connectors.filter(c => c.status === filters.status);
  }
  if (filters?.environment) {
    connectors = connectors.filter(c => c.environment === filters.environment);
  }

  return connectors;
}

export async function updateConnector(
  id: string,
  updates: Partial<IntegrationConnector>,
  userId: string
): Promise<IntegrationConnector> {
  const connector = await connectorsStore.findById(id);
  if (!connector) {
    throw new Error(`Connector ${id} not found`);
  }

  const updated = await connectorsStore.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'IntegrationConnector',
    entityId: id,
    action: 'update',
    before: connector as any,
    after: updated as any,
    actorId: userId,
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Connector updated',
  });

  return updated;
}

export async function updateConnectorStatus(
  id: string,
  status: ConnectorStatus,
  errorMessage?: string
): Promise<IntegrationConnector> {
  const connector = await connectorsStore.findById(id);
  if (!connector) {
    throw new Error(`Connector ${id} not found`);
  }

  const updates: Partial<IntegrationConnector> = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (status === 'active') {
    updates.lastSuccessfulSync = new Date().toISOString();
    updates.lastErrorMessage = undefined;
  } else if (status === 'failed') {
    updates.lastFailedSync = new Date().toISOString();
    updates.lastErrorMessage = errorMessage;
  }

  const updated = await connectorsStore.update(id, updates);

  // Raise alert if status changed to failed
  if (status === 'failed' && connector.status !== 'failed') {
    await raiseAlert({
      ruleCode: 'INTEGRATION_FAILED',
      severity: 'high',
      title: `Integration Failed: ${connector.system} - ${connector.provider}`,
      description: `Integration connector has failed: ${errorMessage || 'Unknown error'}`,
      module: 'Integration',
      entityType: 'IntegrationConnector',
      entityId: id,
      responsibleRole: 'super_admin',
      recommendedAction: 'Check connector status and credentials',
      dueInHours: 4,
      requestId: generateId(),
    });
  }

  return updated;
}

// ============================================================================
// Event Processing
// ============================================================================

export async function processInboundEvent(
  connectorId: string,
  eventType: string,
  providerRecordId: string,
  payload: Record<string, unknown>,
  providerTimestamp?: string
): Promise<IntegrationEvent> {
  const connector = await connectorsStore.findById(connectorId);
  if (!connector) {
    throw new Error(`Connector ${connectorId} not found`);
  }

  // Check for duplicate (idempotency)
  const idempotencyKey = `${connectorId}:${eventType}:${providerRecordId}`;
  const existing = await eventsStore.findOne({ idempotencyKey } as any);
  
  if (existing) {
    // Return existing event (idempotent)
    return existing;
  }

  // Create new event
  const event: IntegrationEvent = {
    id: generateId(),
    connectorId,
    eventType,
    providerRecordId,
    payload,
    dataSource: connector.status === 'active' ? 'integrated_live' : 'integrated_delayed',
    provider: connector.provider,
    receiptTime: new Date().toISOString(),
    providerTimestamp,
    processed: false,
    idempotencyKey,
    retryCount: 0,
    maxRetries: 3,
    inDeadLetter: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await eventsStore.create(event);

  // Update connector last sync
  await connectorsStore.update(connectorId, {
    lastSuccessfulSync: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return event;
}

export async function markEventProcessed(eventId: string): Promise<void> {
  const event = await eventsStore.findById(eventId);
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  await eventsStore.update(eventId, {
    processed: true,
    processedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function markEventFailed(eventId: string, error: string): Promise<void> {
  const event = await eventsStore.findById(eventId);
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const retryCount = event.retryCount + 1;
  const inDeadLetter = retryCount >= event.maxRetries;

  const updates: Partial<IntegrationEvent> = {
    retryCount,
    processingError: error,
    updatedAt: new Date().toISOString(),
  };

  if (inDeadLetter) {
    updates.inDeadLetter = true;
    updates.deadLetterReason = `Max retries (${event.maxRetries}) exceeded`;
  } else {
    // Exponential back-off: 1min, 5min, 25min
    const backoffMinutes = Math.pow(5, retryCount - 1);
    const nextRetryAt = new Date();
    nextRetryAt.setMinutes(nextRetryAt.getMinutes() + backoffMinutes);
    updates.nextRetryAt = nextRetryAt.toISOString();
  }

  await eventsStore.update(eventId, updates);
}

export async function replayDeadLetterEvent(eventId: string): Promise<IntegrationEvent> {
  const event = await eventsStore.findById(eventId);
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  if (!event.inDeadLetter) {
    throw new Error('Event is not in dead letter queue');
  }

  // Reset for retry
  const updated = await eventsStore.update(eventId, {
    inDeadLetter: false,
    deadLetterReason: undefined,
    retryCount: 0,
    processingError: undefined,
    nextRetryAt: undefined,
    updatedAt: new Date().toISOString(),
  });

  await recordAudit({
    entityType: 'IntegrationEvent',
    entityId: eventId,
    action: 'update',
    before: event as any,
    after: updated as any,
    actorId: 'system',
    actorRole: 'super_admin',
    requestId: generateId(),
    reason: 'Dead letter event replayed',
  });

  return updated;
}

export async function listEvents(filters?: {
  connectorId?: string;
  eventType?: string;
  processed?: boolean;
  inDeadLetter?: boolean;
  fromDate?: string;
  toDate?: string;
}): Promise<IntegrationEvent[]> {
  let events = await eventsStore.findAll();

  if (filters?.connectorId) {
    events = events.filter(e => e.connectorId === filters.connectorId);
  }
  if (filters?.eventType) {
    events = events.filter(e => e.eventType === filters.eventType);
  }
  if (filters?.processed !== undefined) {
    events = events.filter(e => e.processed === filters.processed);
  }
  if (filters?.inDeadLetter !== undefined) {
    events = events.filter(e => e.inDeadLetter === filters.inDeadLetter);
  }
  if (filters?.fromDate) {
    events = events.filter(e => e.createdAt >= filters.fromDate!);
  }
  if (filters?.toDate) {
    events = events.filter(e => e.createdAt <= filters.toDate!);
  }

  return events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ============================================================================
// Health Checks
// ============================================================================

export async function performHealthCheck(connectorId: string): Promise<IntegrationHealthCheck> {
  const connector = await connectorsStore.findById(connectorId);
  if (!connector) {
    throw new Error(`Connector ${connectorId} not found`);
  }

  // Perform actual health check (would call provider's health endpoint)
  // For now, simulate based on last sync
  const lastSync = connector.lastSuccessfulSync ? new Date(connector.lastSuccessfulSync) : null;
  const stalenessMinutes = lastSync 
    ? (new Date().getTime() - lastSync.getTime()) / (1000 * 60)
    : Infinity;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  let errorMessage: string | undefined;

  if (connector.status === 'failed') {
    status = 'unhealthy';
    errorMessage = connector.lastErrorMessage || 'Connector failed';
  } else if (stalenessMinutes > connector.dataLatencySLAMinutes) {
    status = 'degraded';
    errorMessage = `Data staleness: ${Math.round(stalenessMinutes)} minutes (SLA: ${connector.dataLatencySLAMinutes} minutes)`;
  }

  const healthCheck: IntegrationHealthCheck = {
    id: generateId(),
    connectorId,
    checkType: 'data_freshness',
    status,
    latencyMs: stalenessMinutes * 60 * 1000,
    lastCheckedAt: new Date().toISOString(),
    errorMessage,
    createdAt: new Date().toISOString(),
  };

  await healthChecksStore.create(healthCheck);

  // Raise alert if unhealthy
  if (status === 'unhealthy') {
    await raiseAlert({
      ruleCode: 'INTEGRATION_STALE',
      severity: 'warning',
      title: `Integration Data Stale: ${connector.system} - ${connector.provider}`,
      description: errorMessage || 'Data freshness check failed',
      module: 'Integration',
      entityType: 'IntegrationConnector',
      entityId: connectorId,
      responsibleRole: 'super_admin',
      recommendedAction: 'Check connector status and data flow',
      dueInHours: 8,
      requestId: generateId(),
    });
  }

  return healthCheck;
}

export async function getLatestHealthCheck(connectorId: string): Promise<IntegrationHealthCheck | null> {
  const all = await healthChecksStore.findAll({ connectorId } as any);
  return all.sort((a, b) => new Date(b.lastCheckedAt).getTime() - new Date(a.lastCheckedAt).getTime())[0] || null;
}

// ============================================================================
// Monitoring
// ============================================================================

export async function getIntegrationMetrics(
  connectorId: string,
  startDate: string,
  endDate: string
): Promise<{
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  retryMessages: number;
  deadLetterCount: number;
  errorRate: number;
}> {
  const events = await eventsStore.findAll({ connectorId } as any);
  const periodEvents = events.filter(e => 
    e.createdAt >= startDate && e.createdAt <= endDate
  );

  const totalMessages = periodEvents.length;
  const successfulMessages = periodEvents.filter(e => e.processed && !e.processingError).length;
  const failedMessages = periodEvents.filter(e => e.processingError && !e.processed).length;
  const retryMessages = periodEvents.filter(e => e.retryCount > 0 && !e.processed).length;
  const deadLetterCount = periodEvents.filter(e => e.inDeadLetter).length;

  const errorRate = totalMessages > 0 ? (failedMessages / totalMessages) * 100 : 0;

  return {
    totalMessages,
    successfulMessages,
    failedMessages,
    retryMessages,
    deadLetterCount,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}

export async function checkAllConnectorsHealth(): Promise<{
  healthy: number;
  degraded: number;
  unhealthy: number;
}> {
  const connectors = await connectorsStore.findAll();
  const results = {
    healthy: 0,
    degraded: 0,
    unhealthy: 0,
  };

  for (const connector of connectors) {
    const healthCheck = await performHealthCheck(connector.id);
    
    switch (healthCheck.status) {
      case 'healthy':
        results.healthy++;
        break;
      case 'degraded':
        results.degraded++;
        break;
      case 'unhealthy':
        results.unhealthy++;
        break;
    }
  }

  return results;
}

// ============================================================================
// Seed Data
// ============================================================================

export async function seedDefaultConnectors(): Promise<void> {
  const existing = await connectorsStore.findAll();
  if (existing.length > 0) return;

  // Create sample connectors (all marked as unavailable since we don't have real credentials)
  const connectors = [
    {
      system: 'telematics',
      provider: 'trimble',
      environment: 'production' as const,
      authMethod: 'api_key' as const,
      credentialsId: 'trimble_api_key',
      status: 'unavailable' as const,
      dataLatencySLAMinutes: 5,
      ownerUserId: 'system',
      ownerRole: 'super_admin',
    },
    {
      system: 'batching_plant',
      provider: 'schwing_stetter',
      environment: 'production' as const,
      authMethod: 'api_key' as const,
      credentialsId: 'schwing_api_key',
      status: 'unavailable' as const,
      dataLatencySLAMinutes: 1,
      ownerUserId: 'system',
      ownerRole: 'super_admin',
    },
    {
      system: 'weighbridge',
      provider: 'mettler_toledo',
      environment: 'production' as const,
      authMethod: 'api_key' as const,
      credentialsId: 'mettler_api_key',
      status: 'unavailable' as const,
      dataLatencySLAMinutes: 1,
      ownerUserId: 'system',
      ownerRole: 'super_admin',
    },
    {
      system: 'email',
      provider: 'smtp',
      environment: 'production' as const,
      authMethod: 'basic' as const,
      credentialsId: 'smtp_credentials',
      status: 'unavailable' as const,
      dataLatencySLAMinutes: 60,
      ownerUserId: 'system',
      ownerRole: 'super_admin',
    },
    {
      system: 'sms',
      provider: 'msg91',
      environment: 'production' as const,
      authMethod: 'api_key' as const,
      credentialsId: 'msg91_api_key',
      status: 'unavailable' as const,
      dataLatencySLAMinutes: 5,
      ownerUserId: 'system',
      ownerRole: 'super_admin',
    },
    {
      system: 'file_storage',
      provider: 'aws_s3',
      environment: 'production' as const,
      authMethod: 'api_key' as const,
      credentialsId: 'aws_s3_credentials',
      status: 'unavailable' as const,
      dataLatencySLAMinutes: 60,
      ownerUserId: 'system',
      ownerRole: 'super_admin',
    },
  ];

  for (const connector of connectors) {
    await createConnector(connector);
  }
}
