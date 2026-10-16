/**
 * Part 13 — Mix Design Service
 * 
 * This is a simplified version for Part 13. Full implementation in Part 14.
 */

import { storage } from './storage';

export interface MixDesignRevision {
  revisionNumber: number;
  status: 'draft' | 'approved' | 'superseded';
  approvedAt?: string;
  approvedBy?: string;
}

export interface MixDesign {
  id: string;
  code: string;
  name: string;
  grade: string;
  revisions: MixDesignRevision[];
}

const mixDesignsStore = storage.getAdapter<MixDesign>('mix_designs');

export async function getMixDesign(id: string): Promise<MixDesign | null> {
  return mixDesignsStore.findById(id);
}

export async function listMixDesigns(): Promise<MixDesign[]> {
  return mixDesignsStore.findAll();
}
