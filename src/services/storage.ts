/**
 * Storage Abstraction Layer
 *
 * Provides an abstract storage interface with an in-memory implementation
 * for demo/development. Can be swapped for PostgreSQL/Supabase backend
 * in future parts without changing service code.
 */

export interface StorageAdapter<T extends { id: string }> {
  findAll(filter?: Partial<T>): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Partial<T>): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
  count(filter?: Partial<T>): Promise<number>;
  append?(entity: T): Promise<T>; // for append-only stores (audit)
}

/**
 * In-memory storage implementation.
 * Used for demo/development. Replace with PostgresAdapter in Part 02b+.
 */
export class InMemoryAdapter<T extends { id: string }> implements StorageAdapter<T> {
  private store: Map<string, T> = new Map();
  private appendOnly: boolean;

  constructor(appendOnly = false) {
    this.appendOnly = appendOnly;
  }

  async findAll(filter?: Partial<T>): Promise<T[]> {
    let results = Array.from(this.store.values());
    if (filter) {
      results = results.filter(item => this.matchesFilter(item, filter));
    }
    return results;
  }

  async findById(id: string): Promise<T | null> {
    return this.store.get(id) || null;
  }

  async findOne(filter: Partial<T>): Promise<T | null> {
    const results = await this.findAll(filter);
    return results[0] || null;
  }

  async create(entity: T): Promise<T> {
    if (this.store.has(entity.id)) {
      throw new Error(`Entity with id ${entity.id} already exists`);
    }
    this.store.set(entity.id, { ...entity });
    return { ...entity };
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    if (this.appendOnly) {
      throw new Error('Append-only store does not support updates');
    }
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }
    const updated = { ...existing, ...updates, id };
    this.store.set(id, updated);
    return { ...updated };
  }

  async delete(id: string): Promise<void> {
    if (this.appendOnly) {
      throw new Error('Append-only store does not support deletes');
    }
    this.store.delete(id);
  }

  async count(filter?: Partial<T>): Promise<number> {
    const results = await this.findAll(filter);
    return results.length;
  }

  async append(entity: T): Promise<T> {
    return this.create(entity);
  }

  private matchesFilter(item: T, filter: Partial<T>): boolean {
    return Object.entries(filter).every(([key, value]) => {
      if (value === undefined) return true;
      return (item as Record<string, unknown>)[key] === value;
    });
  }

  // Test helper: clear all data
  _clear(): void {
    this.store.clear();
  }

  // Test helper: get raw count
  _size(): number {
    return this.store.size;
  }
}

/**
 * Storage registry — singleton that holds all adapters.
 * Services get their adapters from here.
 */
class StorageRegistry {
  private adapters: Map<string, InMemoryAdapter<any>> = new Map();

  getAdapter<T extends { id: string }>(name: string, appendOnly = false): InMemoryAdapter<T> {
    if (!this.adapters.has(name)) {
      this.adapters.set(name, new InMemoryAdapter<T>(appendOnly));
    }
    return this.adapters.get(name)!;
  }

  clearAll(): void {
    this.adapters.forEach(adapter => adapter._clear());
  }
}

export const storage = new StorageRegistry();
