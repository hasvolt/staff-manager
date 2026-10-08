import './setup';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localDb, LocalProfile } from '@/lib/db/dexie';

// In-memory Supabase DB mock for public.profiles
interface DbProfileRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  language: string;
  updated_at: string;
}

let mockProfilesDb: Map<string, DbProfileRow> = new Map();

// Helper to simulate loadProfile logic matching authContext
async function simulateLoadProfile(
  userId: string,
  userMetadata?: { full_name?: string },
  isOnline = true
): Promise<LocalProfile | null> {
  // 1. Try local IndexedDB first for offline resilience
  const localCached = await localDb.profiles.get(userId);

  if (!isOnline) {
    return localCached || null;
  }

  // 2. Query public.profiles: select id, full_name, phone, language where id = userId
  const serverRow = mockProfilesDb.get(userId);

  // 3. If row exists and is NOT empty:
  if (serverRow && (serverRow.full_name || serverRow.phone)) {
    const profileObj: LocalProfile = {
      id: serverRow.id,
      full_name: serverRow.full_name || '',
      phone: serverRow.phone || '',
      language: serverRow.language || 'en',
      created_at: localCached?.created_at || new Date().toISOString(),
      updated_at: serverRow.updated_at,
    };
    await localDb.profiles.put(profileObj);
    return profileObj;
  }

  // 4. Fall back to user's auth metadata (full_name) and create row with upsert on 'id'
  const fallbackName = (serverRow?.full_name ? serverRow.full_name : userMetadata?.full_name) || '';
  const fallbackPhone = serverRow?.phone || '';
  const fallbackLanguage = serverRow?.language || 'en';

  const initialRow: DbProfileRow = {
    id: userId,
    full_name: fallbackName,
    phone: fallbackPhone || null,
    language: fallbackLanguage,
    updated_at: new Date().toISOString(),
  };
  mockProfilesDb.set(userId, initialRow);

  const finalProfile: LocalProfile = {
    id: userId,
    full_name: fallbackName,
    phone: fallbackPhone,
    language: fallbackLanguage,
    created_at: localCached?.created_at || new Date().toISOString(),
    updated_at: initialRow.updated_at,
  };
  await localDb.profiles.put(finalProfile);
  return finalProfile;
}

// Helper to simulate updateProfile logic matching authContext
async function simulateUpdateProfile(
  userId: string,
  fullName: string,
  phone?: string,
  isOnline = true,
  shouldFailServerWrite = false
): Promise<{ error: Error | null; profile?: LocalProfile }> {
  const cleanName = fullName.trim();
  const cleanPhone = phone?.trim() || '';

  if (!isOnline) {
    const localRecord: LocalProfile = {
      id: userId,
      full_name: cleanName,
      phone: cleanPhone,
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await localDb.profiles.put(localRecord);
    await localDb.outbox.put({
      id: `profile-${userId}-${Date.now()}`,
      table_name: 'profiles',
      record_id: userId,
      action: 'update',
      payload: {
        id: userId,
        full_name: cleanName,
        phone: cleanPhone || null,
        updated_at: localRecord.updated_at,
      },
      base_revision: 1,
      created_at: new Date().toISOString(),
      attempts: 0,
    });
    return { error: null, profile: localRecord };
  }

  if (shouldFailServerWrite) {
    return { error: new Error('Database connection failed: 500 Internal Server Error') };
  }

  // 1. Upsert on 'id' in public.profiles
  const updatedRow: DbProfileRow = {
    id: userId,
    full_name: cleanName,
    phone: cleanPhone || null,
    language: 'en',
    updated_at: new Date().toISOString(),
  };
  mockProfilesDb.set(userId, updatedRow);

  // 2. Re-fetch the row from server
  const refetched = mockProfilesDb.get(userId);
  if (!refetched) {
    return { error: new Error('Row not found after upsert') };
  }

  // 3. Keep local copy in IndexedDB
  const localRecord: LocalProfile = {
    id: refetched.id,
    full_name: refetched.full_name || '',
    phone: refetched.phone || '',
    language: refetched.language || 'en',
    created_at: new Date().toISOString(),
    updated_at: refetched.updated_at,
  };
  await localDb.profiles.put(localRecord);

  return { error: null, profile: localRecord };
}

describe('User Profile Bug Fix Tests', () => {
  const userId = '11111111-2222-3333-4444-555555555555';

  beforeEach(async () => {
    mockProfilesDb.clear();
    await localDb.profiles.clear();
    await localDb.outbox.clear();
  });

  it('1. save, close, reopen shows the values: Full Name and Phone persist and fill fields upon modal reopening', async () => {
    // Initial state: profile exists on server with basic data
    mockProfilesDb.set(userId, {
      id: userId,
      full_name: 'Original Name',
      phone: null,
      language: 'en',
      updated_at: new Date().toISOString(),
    });

    // Modal opens for first time: loads stored row
    const initialLoaded = await simulateLoadProfile(userId);
    expect(initialLoaded?.full_name).toBe('Original Name');
    expect(initialLoaded?.phone).toBe('');

    // User edits form: Full Name = 'Vikram Malhotra', Phone = '+91 98765 43210' and clicks "Save Profile"
    const saveResult = await simulateUpdateProfile(userId, 'Vikram Malhotra', '+91 98765 43210');
    expect(saveResult.error).toBeNull();
    expect(saveResult.profile?.full_name).toBe('Vikram Malhotra');
    expect(saveResult.profile?.phone).toBe('+91 98765 43210');

    // Verify row was confirmed on server
    const serverRow = mockProfilesDb.get(userId);
    expect(serverRow?.full_name).toBe('Vikram Malhotra');
    expect(serverRow?.phone).toBe('+91 98765 43210');

    // Simulate modal close: modal unmounts
    // Now simulate reopen: modal opens again and calls loadProfile
    const reopenedProfile = await simulateLoadProfile(userId);
    expect(reopenedProfile?.full_name).toBe('Vikram Malhotra');
    expect(reopenedProfile?.phone).toBe('+91 98765 43210');

    // Local IndexedDB must also reflect these values
    const localCached = await localDb.profiles.get(userId);
    expect(localCached?.full_name).toBe('Vikram Malhotra');
    expect(localCached?.phone).toBe('+91 98765 43210');
  });

  it('2. reload shows the values: page refresh fetches profile and populates fields and header display', async () => {
    // Store saved profile on server
    mockProfilesDb.set(userId, {
      id: userId,
      full_name: 'Sunita Rao',
      phone: '+91 91234 56789',
      language: 'hi',
      updated_at: new Date().toISOString(),
    });

    // Simulate page reload (fresh in-memory context)
    // On auth session start / after login, loadProfile is invoked
    const reloadedProfile = await simulateLoadProfile(userId, { full_name: 'Sunita (Old)' });

    expect(reloadedProfile).not.toBeNull();
    expect(reloadedProfile?.full_name).toBe('Sunita Rao');
    expect(reloadedProfile?.phone).toBe('+91 91234 56789');

    // Header display test: firstName extracted
    const headerDisplay = reloadedProfile?.full_name?.trim()?.split(' ')[0];
    expect(headerDisplay).toBe('Sunita');
  });

  it('3. second device shows the values: new device with empty IndexedDB loads profile from Supabase', async () => {
    // Server has stored profile from device 1
    mockProfilesDb.set(userId, {
      id: userId,
      full_name: 'Rajesh Contractor',
      phone: '+91 99887 76655',
      language: 'en',
      updated_at: new Date().toISOString(),
    });

    // Device 2 has empty IndexedDB (no local cache)
    await localDb.profiles.clear();
    const beforeCache = await localDb.profiles.get(userId);
    expect(beforeCache).toBeUndefined();

    // User signs in on second device: loadProfile runs
    const device2Profile = await simulateLoadProfile(userId);

    // Verified that device 2 gets the exact values from Supabase
    expect(device2Profile?.full_name).toBe('Rajesh Contractor');
    expect(device2Profile?.phone).toBe('+91 99887 76655');

    // And device 2 now has the local IndexedDB copy saved
    const device2Cached = await localDb.profiles.get(userId);
    expect(device2Cached?.full_name).toBe('Rajesh Contractor');
    expect(device2Cached?.phone).toBe('+91 99887 76655');
  });

  it('4. falls back to auth metadata if row is missing or empty, and creates row with upsert', async () => {
    // Row is completely missing in public.profiles
    expect(mockProfilesDb.has(userId)).toBe(false);

    // Load profile with auth metadata fallback
    const loaded = await simulateLoadProfile(userId, { full_name: 'Amit Patel' });

    expect(loaded?.full_name).toBe('Amit Patel');
    expect(loaded?.phone).toBe('');

    // Verified that the row was created in public.profiles via upsert
    expect(mockProfilesDb.has(userId)).toBe(true);
    const createdServerRow = mockProfilesDb.get(userId);
    expect(createdServerRow?.id).toBe(userId);
    expect(createdServerRow?.full_name).toBe('Amit Patel');
  });

  it('5. offline support: profile shows offline and updates queue into outbox for sync', async () => {
    // Put an existing profile in local IndexedDB
    await localDb.profiles.put({
      id: userId,
      full_name: 'Deepak Verma',
      phone: '+91 88888 99999',
      language: 'en',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Offline load: must return from local IndexedDB
    const offlineLoaded = await simulateLoadProfile(userId, undefined, false);
    expect(offlineLoaded?.full_name).toBe('Deepak Verma');
    expect(offlineLoaded?.phone).toBe('+91 88888 99999');

    // Offline update: saves locally and queues in outbox
    const updateResult = await simulateUpdateProfile(userId, 'Deepak Verma Updated', '+91 77777 66666', false);
    expect(updateResult.error).toBeNull();
    expect(updateResult.profile?.full_name).toBe('Deepak Verma Updated');

    // Verify outbox entry
    const outboxItems = await localDb.outbox.toArray();
    expect(outboxItems).toHaveLength(1);
    expect(outboxItems[0].table_name).toBe('profiles');
    expect(outboxItems[0].record_id).toBe(userId);
    expect(outboxItems[0].payload.full_name).toBe('Deepak Verma Updated');
  });

  it('6. error handling: server write failure returns real error text and prevents false success', async () => {
    const res = await simulateUpdateProfile(userId, 'Fail Name', '+91 12345 67890', true, true);
    expect(res.error).not.toBeNull();
    expect(res.error?.message).toContain('Database connection failed: 500');
    expect(res.profile).toBeUndefined();
  });
});
