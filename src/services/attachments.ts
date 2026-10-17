/**
 * 2.4 Attachment & Evidence Service
 *
 * Secure upload with type allow-list, SHA-256 hashing, signed URLs,
 * and configurable evidence categories.
 */

import { storage } from './storage';
import { Attachment, AttachmentType, EvidenceCategory, SignedUrl, UserRole } from './types';
import { generateId, sha256 } from './utils';
import { recordCreate } from './audit';

const attachmentsStore = storage.getAdapter<Attachment>('attachments');

// Allowed MIME types
const ALLOWED_TYPES: AttachmentType[] = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Size limits (bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB for images

// Signed URL expiry
const SIGNED_URL_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// In-memory signed URL store (in production, this would be JWT-based)
const signedUrls = new Map<string, { attachmentId: string; expiresAt: string; userId: string }>();

/**
 * Validate file type and size.
 */
export function validateAttachment(
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(mimeType as AttachmentType)) {
    return { valid: false, error: `File type ${mimeType} not allowed. Allowed: ${ALLOWED_TYPES.join(', ')}` };
  }

  if (sizeBytes > MAX_FILE_SIZE) {
    return { valid: false, error: `File size ${sizeBytes} exceeds maximum ${MAX_FILE_SIZE} bytes` };
  }

  if (mimeType.startsWith('image/') && sizeBytes > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Image size ${sizeBytes} exceeds maximum ${MAX_IMAGE_SIZE} bytes` };
  }

  return { valid: true };
}

/**
 * Upload an attachment.
 * In production, this would:
 * 1. Validate type/size
 * 2. Scan for malware
 * 3. Re-encode images to strip scripts
 * 4. Extract EXIF/GPS metadata
 * 5. Store original + compressed preview
 * 6. Generate SHA-256 hash
 */
export async function uploadAttachment(params: {
  entityType: string;
  entityId: string;
  category: EvidenceCategory;
  fileName: string;
  mimeType: AttachmentType;
  fileContent: ArrayBuffer;
  uploaderId: string;
  uploaderRole: UserRole;
  captureTime?: string;
  deviceInfo?: { model?: string; os?: string; app?: string };
  gpsLocation?: { lat: number; lng: number; accuracy?: number };
  requestId: string;
}): Promise<Attachment> {
  // Validate
  const validation = validateAttachment(params.mimeType, params.fileContent.byteLength);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Compute SHA-256 hash
  const hash = await sha256(params.fileContent);

  // Check for duplicate (same hash)
  const existing = await attachmentsStore.findAll();
  const duplicate = existing.find(a => a.sha256 === hash && !a.isDeleted);
  if (duplicate) {
    throw new Error(`Duplicate file detected (SHA-256: ${hash}). Attachment ${duplicate.id} already exists.`);
  }

  const attachment: Attachment = {
    id: generateId(),
    entityType: params.entityType,
    entityId: params.entityId,
    category: params.category,
    fileName: params.fileName,
    mimeType: params.mimeType,
    sizeBytes: params.fileContent.byteLength,
    sha256: hash,
    uploaderId: params.uploaderId,
    uploadedAt: new Date().toISOString(),
    captureTime: params.captureTime,
    deviceInfo: params.deviceInfo,
    gpsLocation: params.gpsLocation,
    isDeleted: false,
  };

  await attachmentsStore.create(attachment);

  // Record in audit trail
  await recordCreate(
    'Attachment',
    attachment.id,
    { entityType: attachment.entityType, entityId: attachment.entityId, category: attachment.category, fileName: attachment.fileName },
    params.uploaderId,
    params.uploaderRole,
    params.requestId
  );

  return attachment;
}

/**
 * Generate a signed URL for downloading an attachment.
 * Requires permission check on the parent record.
 */
export async function generateSignedUrl(params: {
  attachmentId: string;
  userId: string;
  hasPermission: boolean;
}): Promise<SignedUrl> {
  if (!params.hasPermission) {
    throw new Error('Permission denied: user does not have access to parent record');
  }

  const attachment = await attachmentsStore.findById(params.attachmentId);
  if (!attachment) {
    throw new Error(`Attachment ${params.attachmentId} not found`);
  }
  if (attachment.isDeleted) {
    throw new Error('Attachment has been deleted');
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_EXPIRY_MS).toISOString();

  // In production, this would be a signed S3/Supabase Storage URL
  // For demo, we generate a token-based URL
  const token = generateId();
  signedUrls.set(token, {
    attachmentId: params.attachmentId,
    expiresAt,
    userId: params.userId,
  });

  return {
    url: `/api/attachments/${params.attachmentId}/download?token=${token}`,
    expiresAt,
    attachmentId: params.attachmentId,
  };
}

/**
 * Validate a signed URL and return the attachment.
 */
export async function validateSignedUrl(token: string, userId: string): Promise<Attachment> {
  const record = signedUrls.get(token);
  if (!record) {
    throw new Error('Invalid or expired signed URL');
  }

  if (new Date(record.expiresAt) < new Date()) {
    signedUrls.delete(token);
    throw new Error('Signed URL has expired');
  }

  if (record.userId !== userId) {
    throw new Error('Signed URL was issued to a different user');
  }

  const attachment = await attachmentsStore.findById(record.attachmentId);
  if (!attachment || attachment.isDeleted) {
    throw new Error('Attachment not found or deleted');
  }

  return attachment;
}

/**
 * Get all attachments for an entity.
 */
export async function getAttachmentsForEntity(
  entityType: string,
  entityId: string,
  category?: EvidenceCategory
): Promise<Attachment[]> {
  const all = await attachmentsStore.findAll();
  let results = all.filter(a =>
    a.entityType === entityType &&
    a.entityId === entityId &&
    !a.isDeleted
  );

  if (category) {
    results = results.filter(a => a.category === category);
  }

  return results.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

/**
 * Soft-delete an attachment.
 */
export async function deleteAttachment(
  attachmentId: string,
  userId: string,
  userRole: UserRole,
  requestId: string
): Promise<void> {
  const attachment = await attachmentsStore.findById(attachmentId);
  if (!attachment) {
    throw new Error(`Attachment ${attachmentId} not found`);
  }

  // Only uploader or admin can delete
  if (attachment.uploaderId !== userId && userRole !== 'company_admin' && userRole !== 'super_admin') {
    throw new Error('Permission denied: only uploader or admin can delete attachments');
  }

  await attachmentsStore.update(attachmentId, { isDeleted: true });
}

/**
 * Get evidence categories.
 */
export function getEvidenceCategories(): EvidenceCategory[] {
  return [
    'hour_meter',
    'odometer',
    'fuel_meter',
    'registration_plate',
    'damage',
    'delivery_receipt',
    'slump_test',
    'cube_test',
    'work_completion',
    'signature',
    'invoice',
    'general',
  ];
}
