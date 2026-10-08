import './setup';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '@/lib/db/dexie';
import { LocalRepository, generateUUID, getDeviceId } from '@/lib/db/repository';

describe('Local Database & Repository Tests', () => {
  const staffRepo = new LocalRepository<any>(localDb.staff, 'staff');
  const orgId = generateUUID();

  beforeEach(async () => {
    await localDb.staff.clear();
    await localDb.outbox.clear();
  });

  it('generates compliant UUID and device ID', () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

    const devId = getDeviceId();
    expect(devId).toBeDefined();
    expect(devId.length).toBeGreaterThan(10);
  });

  it('creates staff record locally with immediate outbox enqueueing', async () => {
    const newStaff = await staffRepo.create({
      org_id: orgId,
      name: 'Ramesh Mistri',
      status: 'active',
      payment_type: 'daily',
      rate: 800,
      weekly_off: [0],
      rate_history: [],
    });

    expect(newStaff.id).toBeDefined();
    expect(newStaff.name).toBe('Ramesh Mistri');
    expect(newStaff.syncStatus).toBe('pending');
    expect(newStaff.revision).toBe(1);

    // Verify outbox entry
    const outboxItems = await localDb.outbox.toArray();
    expect(outboxItems).toHaveLength(1);
    expect(outboxItems[0].table_name).toBe('staff');
    expect(outboxItems[0].record_id).toBe(newStaff.id);
    expect(outboxItems[0].action).toBe('insert');
  });

  it('updates staff record locally and increments revision in outbox', async () => {
    const created = await staffRepo.create({
      org_id: orgId,
      name: 'Suresh Helper',
      status: 'active',
      payment_type: 'daily',
      rate: 500,
      weekly_off: [0],
      rate_history: [],
    });

    const updated = await staffRepo.update(created.id, { rate: 550 });
    expect(updated.rate).toBe(550);
    expect(updated.revision).toBe(2);

    const outboxItems = await localDb.outbox.toArray();
    expect(outboxItems.length).toBeGreaterThanOrEqual(2);
  });

  it('soft-deletes staff record without permanent data loss', async () => {
    const created = await staffRepo.create({
      org_id: orgId,
      name: 'Anil Cook',
      status: 'active',
      payment_type: 'monthly',
      rate: 15000,
      weekly_off: [],
      rate_history: [],
    });

    await staffRepo.softDelete(created.id);

    // Should not appear in standard active list
    const activeList = await staffRepo.list(orgId, false);
    expect(activeList.find((s) => s.id === created.id)).toBeUndefined();

    // Should be present when includeDeleted is true
    const allList = await staffRepo.list(orgId, true);
    const found = allList.find((s) => s.id === created.id);
    expect(found).toBeDefined();
    expect(found.deleted_at).toBeDefined();

    // Restore test
    await staffRepo.restore(created.id);
    const restoredList = await staffRepo.list(orgId, false);
    expect(restoredList.find((s) => s.id === created.id)).toBeDefined();
  });
});
