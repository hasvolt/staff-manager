import { localDb, OutboxItem } from './dexie';
import { SyncedEntity } from '@/lib/sync/types';

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let memoryDeviceId: string | null = null;

export function getDeviceId(): string {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    let devId = window.localStorage.getItem('staff_manager_device_id');
    if (!devId) {
      devId = generateUUID();
      window.localStorage.setItem('staff_manager_device_id', devId);
    }
    return devId;
  }
  if (!memoryDeviceId) {
    memoryDeviceId = generateUUID();
  }
  return memoryDeviceId;
}

export interface IRepository<T extends SyncedEntity> {
  get(id: string): Promise<T | undefined>;
  list(orgId: string, includeDeleted?: boolean): Promise<T[]>;
  create(data: Omit<T, 'id' | 'created_at' | 'updated_at' | 'revision'> & { id?: string }): Promise<T>;
  update(id: string, updates: Partial<T>): Promise<T>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
  bulkCreate(items: (Omit<T, 'id' | 'created_at' | 'updated_at' | 'revision'> & { id?: string })[]): Promise<T[]>;
}

export class LocalRepository<T extends SyncedEntity> implements IRepository<T> {
  constructor(
    private table: any,
    private tableName: string
  ) {}

  async get(id: string): Promise<T | undefined> {
    return await this.table.get(id);
  }

  async list(orgId: string, includeDeleted = false): Promise<T[]> {
    let query = this.table.where('org_id').equals(orgId);
    const all = await query.toArray();
    if (includeDeleted) return all;
    return all.filter((item: T) => !item.deleted_at);
  }

  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at' | 'revision'> & { id?: string }): Promise<T> {
    const now = new Date().toISOString();
    const deviceId = getDeviceId();
    const record: T = {
      ...data,
      id: data.id || generateUUID(),
      created_at: (data as any).created_at || now,
      updated_at: now,
      device_id: deviceId,
      revision: 1,
      deleted_at: null,
      syncStatus: 'pending',
    } as unknown as T;

    await this.table.put(record);

    // Enqueue to Outbox
    await localDb.outbox.put({
      id: generateUUID(),
      table_name: this.tableName,
      record_id: record.id,
      action: 'insert',
      payload: record,
      base_revision: 0,
      created_at: now,
      attempts: 0,
    });

    return record;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const existing = await this.get(id);
    if (!existing) {
      throw new Error(`Record ${id} not found in ${this.tableName}`);
    }

    const now = new Date().toISOString();
    const updated: T = {
      ...existing,
      ...updates,
      updated_at: now,
      device_id: getDeviceId(),
      revision: (existing.revision || 1) + 1,
      syncStatus: 'pending',
    };

    await this.table.put(updated);

    await localDb.outbox.put({
      id: generateUUID(),
      table_name: this.tableName,
      record_id: id,
      action: 'update',
      payload: updated,
      base_revision: existing.revision || 1,
      created_at: now,
      attempts: 0,
    });

    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    const deleted: T = {
      ...existing,
      deleted_at: now,
      updated_at: now,
      device_id: getDeviceId(),
      revision: (existing.revision || 1) + 1,
      syncStatus: 'pending',
    };

    await this.table.put(deleted);

    await localDb.outbox.put({
      id: generateUUID(),
      table_name: this.tableName,
      record_id: id,
      action: 'delete',
      payload: deleted,
      base_revision: existing.revision || 1,
      created_at: now,
      attempts: 0,
    });
  }

  async restore(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;

    const now = new Date().toISOString();
    const restored: T = {
      ...existing,
      deleted_at: null,
      updated_at: now,
      device_id: getDeviceId(),
      revision: (existing.revision || 1) + 1,
      syncStatus: 'pending',
    };

    await this.table.put(restored);

    await localDb.outbox.put({
      id: generateUUID(),
      table_name: this.tableName,
      record_id: id,
      action: 'update',
      payload: restored,
      base_revision: existing.revision || 1,
      created_at: now,
      attempts: 0,
    });
  }

  async bulkCreate(items: (Omit<T, 'id' | 'created_at' | 'updated_at' | 'revision'> & { id?: string })[]): Promise<T[]> {
    const results: T[] = [];
    for (const item of items) {
      const res = await this.create(item);
      results.push(res);
    }
    return results;
  }
}

// Repositories instances for application usage
export const orgRepo = new LocalRepository<any>(localDb.organizations, 'organizations');
export const staffRepo = new LocalRepository<any>(localDb.staff, 'staff');
export const attendanceRepo = new LocalRepository<any>(localDb.attendance_entries, 'attendance_entries');
export const workRepo = new LocalRepository<any>(localDb.work_entries, 'work_entries');
export const paymentRepo = new LocalRepository<any>(localDb.payments, 'payments');
export const siteRepo = new LocalRepository<any>(localDb.sites, 'sites');
export const workTypeRepo = new LocalRepository<any>(localDb.work_types, 'work_types');
export const customFieldRepo = new LocalRepository<any>(localDb.custom_field_defs, 'custom_field_defs');
export const periodClosingRepo = new LocalRepository<any>(localDb.period_closings, 'period_closings');
