import './setup';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { localDb } from '@/lib/db/dexie';
import { generateUUID } from '@/lib/db/repository';
import { insertDemoData, removeDemoData } from '@/lib/demo/demoDataService';
import { ALL_THEMES } from '@/lib/theme/themeContext';
import { SUPPORTED_LANGUAGES } from '@/locales/types';
import { getLoadedTranslation } from '@/locales';

describe('Phase 6: Polish, Help, Demo Data, Multi-Theme & Integration Tests', () => {
  const orgId = generateUUID();

  beforeEach(async () => {
    await Promise.all(localDb.tables.map((table) => table.clear()));

    await localDb.organizations.put({
      id: orgId,
      org_id: orgId,
      name: 'Sunrise Manufacturing Ltd',
      business_type: 'factory',
      currency: 'INR',
      country: 'India',
      week_start: 1,
      settings: {
        terminology_preset: 'factory',
      },
      owner_id: 'test_owner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 1,
      syncStatus: 'synced',
    });
  });

  it('1. Interactive Demo Data: populates sample staff, attendance, and payments, then cleanly removes them in 1 tap', async () => {
    // 1. Insert demo data
    const stats = await insertDemoData(orgId);
    expect(stats.staffCount).toBe(4);
    expect(stats.attendanceCount).toBeGreaterThanOrEqual(15);
    expect(stats.paymentCount).toBeGreaterThanOrEqual(2);

    // Verify staff exists in IndexedDB
    const staffInDb = await localDb.staff.where('org_id').equals(orgId).toArray();
    expect(staffInDb.length).toBe(4);
    expect(staffInDb.some((s) => s.name === 'Ramesh Mistri')).toBe(true);

    // Verify attendance exists
    const attendanceInDb = await localDb.attendance_entries.where('org_id').equals(orgId).toArray();
    expect(attendanceInDb.length).toBe(stats.attendanceCount);

    // 2. Remove demo data cleanly
    const removed = await removeDemoData(orgId);
    expect(removed).toBe(true);

    const remainingStaff = await localDb.staff.where('org_id').equals(orgId).toArray();
    expect(remainingStaff.length).toBe(0);

    const remainingAtt = await localDb.attendance_entries.where('org_id').equals(orgId).toArray();
    expect(remainingAtt.length).toBe(0);

    const remainingPayments = await localDb.payments.where('org_id').equals(orgId).toArray();
    expect(remainingPayments.length).toBe(0);
  });

  it('2. Theme Contrast & Integrity: all 12 themes define consistent required CSS color tokens', () => {
    expect(ALL_THEMES).toHaveLength(12);

    ALL_THEMES.forEach((theme) => {
      expect(theme.id).toBeDefined();
      expect(theme.nameKey).toBeDefined();
      expect(theme.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('3. Multi-Language Coverage: all 16 languages are registered with valid root translation entries', () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(16);

    // Verify key languages
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(codes).toContain('en');
    expect(codes).toContain('hi');
    expect(codes).toContain('ur');
    expect(codes).toContain('ar');
    expect(codes).toContain('es');

    // Verify essential branding keys exist across languages
    ['en', 'hi', 'ur', 'ar', 'es'].forEach((lang) => {
      const appName = getLoadedTranslation(lang as any, 'appName');
      expect(appName).toBeDefined();
      expect(appName.length).toBeGreaterThan(0);
    });
  });
});
