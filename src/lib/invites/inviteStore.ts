import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { localDb, LocalOrganization, LocalMembership } from '@/lib/db/dexie';
import { generateUUID } from '@/lib/db/repository';

export interface InviteRecord {
  id: string;
  code: string;
  org_id: string;
  org_name?: string;
  role: 'manager' | 'supervisor' | 'accountant' | 'viewer';
  assigned_site_ids: string[];
  expires_at: string;
  max_uses: number;
  used_count: number;
  revoked_at?: string | null;
  created_at: string;
  created_by?: string;
}

const LOCAL_INVITES_STORAGE_KEY = 'staff_manager_local_invites';

function getStorage(): Storage | null {
  if (typeof localStorage !== 'undefined') return localStorage;
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return null;
}

export function getStoredLocalInvites(orgId?: string): InviteRecord[] {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const raw = storage.getItem(LOCAL_INVITES_STORAGE_KEY);
    if (!raw) return [];
    const list: InviteRecord[] = JSON.parse(raw);
    if (orgId) {
      return list.filter((item) => item.org_id === orgId && !item.revoked_at);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveStoredLocalInvite(invite: InviteRecord): void {
  try {
    const storage = getStorage();
    if (!storage) return;
    const all = getStoredLocalInvites();
    const existingIndex = all.findIndex((i) => i.id === invite.id || i.code === invite.code);
    if (existingIndex >= 0) {
      all[existingIndex] = invite;
    } else {
      all.unshift(invite);
    }
    storage.setItem(LOCAL_INVITES_STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.warn('Could not save local invite:', e);
  }
}

export function generateLocalCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'SM-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createInviteCode(params: {
  orgId: string;
  orgName: string;
  role: 'manager' | 'supervisor' | 'accountant' | 'viewer';
  assignedSiteIds: string[];
  maxUses: number;
  userId?: string;
}): Promise<{ code: string; invite: InviteRecord; source: 'cloud' | 'local' }> {
  const { orgId, orgName, role, assignedSiteIds, maxUses, userId } = params;

  // Try Supabase if configured and user is signed in
  if (isSupabaseConfigured && userId) {
    try {
      const { data, error: invErr } = await supabase
        .from('invites')
        .insert({
          org_id: orgId,
          role,
          assigned_site_ids: role === 'supervisor' ? assignedSiteIds : [],
          max_uses: maxUses,
          created_by: userId,
        })
        .select()
        .single();

      if (!invErr && data) {
        const invObj: InviteRecord = {
          id: data.id,
          code: data.code,
          org_id: data.org_id,
          org_name: orgName,
          role: data.role,
          assigned_site_ids: data.assigned_site_ids || [],
          expires_at: data.expires_at,
          max_uses: data.max_uses || 1,
          used_count: data.used_count || 0,
          created_at: data.created_at,
          created_by: userId,
        };
        saveStoredLocalInvite(invObj);
        return { code: data.code, invite: invObj, source: 'cloud' };
      }
    } catch (e) {
      console.warn('Supabase invite creation failed, generating local fallback:', e);
    }
  }

  // Local / Offline fallback invite generation
  const localCode = generateLocalCode();
  const localInv: InviteRecord = {
    id: generateUUID(),
    code: localCode,
    org_id: orgId,
    org_name: orgName,
    role,
    assigned_site_ids: role === 'supervisor' ? assignedSiteIds : [],
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    max_uses: maxUses,
    used_count: 0,
    created_at: new Date().toISOString(),
    created_by: userId || 'local_user',
  };

  saveStoredLocalInvite(localInv);
  return { code: localCode, invite: localInv, source: 'local' };
}

export async function revokeInviteCode(inviteIdOrCode: string): Promise<boolean> {
  let success = false;

  // Revoke in Supabase if configured
  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('invites')
        .update({ revoked_at: new Date().toISOString() })
        .or(`id.eq.${inviteIdOrCode},code.eq.${inviteIdOrCode}`);
      success = true;
    } catch (e) {
      console.warn('Supabase revoke failed:', e);
    }
  }

  // Revoke in local storage
  const all = getStoredLocalInvites();
  const updated = all.map((inv) => {
    if (inv.id === inviteIdOrCode || inv.code === inviteIdOrCode) {
      return { ...inv, revoked_at: new Date().toISOString() };
    }
    return inv;
  });
  const storage = getStorage();
  if (storage) {
    storage.setItem(LOCAL_INVITES_STORAGE_KEY, JSON.stringify(updated));
  }

  return success || true;
}

export async function processInviteAcceptance(
  rawCode: string,
  userId?: string
): Promise<{ error: Error | null; orgId?: string; role?: string; orgName?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return { error: new Error('Please enter a valid invite code.') };
  }

  // 1. Check local invites first
  const allLocal = getStoredLocalInvites();
  const localMatch = allLocal.find((i) => i.code.toUpperCase() === code);

  if (localMatch) {
    if (localMatch.revoked_at) {
      return { error: new Error('This invite code has been revoked by the business owner.') };
    }
    if (new Date(localMatch.expires_at) < new Date()) {
      return { error: new Error('This invite code has expired.') };
    }
    if (localMatch.used_count >= localMatch.max_uses) {
      return { error: new Error('This invite code has already reached its maximum number of uses.') };
    }

    // Increment usage
    localMatch.used_count += 1;
    saveStoredLocalInvite(localMatch);

    // Ensure the organization exists locally
    let org = await localDb.organizations.get(localMatch.org_id);
    if (!org) {
      // Create replica of this organization on this device
      const replicaOrg: LocalOrganization = {
        id: localMatch.org_id,
        org_id: localMatch.org_id,
        name: localMatch.org_name || 'Joined Business',
        business_type: 'other',
        currency: 'INR',
        country: 'India',
        week_start: 1,
        settings: {
          terminology_preset: 'general',
          month_calc_mode: 'actual',
        },
        owner_id: localMatch.created_by || 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: 1,
        syncStatus: 'local-only',
      };
      await localDb.organizations.put(replicaOrg);
      org = replicaOrg;
    }

    // Add or update membership for this user/device
    const memberId = generateUUID();
    const newMembership: LocalMembership = {
      id: memberId,
      org_id: localMatch.org_id,
      user_id: userId || 'local_user',
      role: localMatch.role,
      assigned_site_ids: localMatch.assigned_site_ids || [],
      status: 'active',
      created_at: new Date().toISOString(),
      syncStatus: 'local-only',
    };
    await localDb.memberships.put(newMembership);

    return {
      error: null,
      orgId: localMatch.org_id,
      role: localMatch.role,
      orgName: org.name,
    };
  }

  // 2. Check cloud Supabase if user is signed in
  if (isSupabaseConfigured && userId) {
    try {
      const { data: joinedOrgId, error: rpcErr } = await supabase.rpc('accept_invite', {
        p_code: code,
      });

      if (rpcErr) throw rpcErr;
      if (joinedOrgId) {
        return { error: null, orgId: joinedOrgId };
      }
    } catch (err: any) {
      return {
        error: new Error(err.message || 'Invalid or expired invite code. Please check with your business owner.'),
      };
    }
  }

  // If not found in local and user is not signed in to check cloud
  if (!userId) {
    return {
      error: new Error(
        'Invite code not recognized locally. If this is a cloud invite code, please sign in or register first.'
      ),
    };
  }

  return { error: new Error('Invalid or expired invite code.') };
}
