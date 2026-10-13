import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/features/auth/authContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { localDb, LocalOrganization } from '@/lib/db/dexie';
import { orgRepo, generateUUID } from '@/lib/db/repository';
import { syncEngine } from '@/lib/sync/syncEngine';
import { deleteOrgStorageFiles } from '@/lib/supabase/storage';
import { processInviteAcceptance } from '@/lib/invites/inviteStore';

export interface BusinessSettings {
  address?: string;
  phone?: string;
  terminology_preset?: 'general' | 'construction' | 'shop' | 'factory' | 'farm' | 'household' | 'other';
  month_calc_mode?: 'fixed30' | 'actual';
  print_header?: string;
  print_footer?: string;
  hide_payments_from_viewers?: boolean;
  require_owner_delete_approval?: boolean;
  custom_site_label?: string; // e.g. "Shop", "Project", "Field", "Branch"
  custom_work_label?: string; // e.g. "Task", "Service", "Operation"
}

interface OrgContextType {
  currentOrg: LocalOrganization | null;
  organizations: LocalOrganization[];
  role: string;
  isLoading: boolean;
  createBusiness: (name: string, businessType?: string, currency?: string, country?: string, weekStart?: number) => Promise<{ error: Error | null; orgId?: string }>;
  joinWithInvite: (code: string) => Promise<{ error: Error | null }>;
  switchBusiness: (orgId: string) => void;
  updateSettings: (updates: Partial<LocalOrganization> & { settings?: BusinessSettings }) => Promise<{ error: Error | null }>;
  reloadOrganizations: () => Promise<void>;
  upgradeLocalToCloud: () => Promise<{ error: Error | null; count?: number }>;
  deleteBusiness: (orgId: string, onProgress?: (msg: string) => void) => Promise<{ error: Error | null }>;
}

const OrgContext = createContext<OrgContextType | null>(null);

const DEFAULT_ORG_ID_KEY = 'staff_manager_active_org_id';

export const OrgProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLocalMode } = useAuth();
  const [currentOrg, setCurrentOrg] = useState<LocalOrganization | null>(null);
  const [organizations, setOrganizations] = useState<LocalOrganization[]>([]);
  const [role, setRole] = useState<string>('owner');
  const [isLoading, setIsLoading] = useState(true);

  const loadLocalOrgs = useCallback(async () => {
    const list = await localDb.organizations.toArray();
    setOrganizations(list);

    const savedOrgId = localStorage.getItem(DEFAULT_ORG_ID_KEY);
    let active = list.find((o) => o.id === savedOrgId) || list[0] || null;

    // If local mode and no org exists yet, bootstrap default local business
    if (!active && isLocalMode && list.length === 0) {
      const defaultOrg: LocalOrganization = {
        id: generateUUID(),
        org_id: '',
        name: 'My Business',
        business_type: 'other',
        currency: 'INR',
        country: 'India',
        week_start: 1,
        settings: {
          terminology_preset: 'general',
          month_calc_mode: 'actual',
        },
        owner_id: 'local_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: 1,
        syncStatus: 'local-only',
      };
      defaultOrg.org_id = defaultOrg.id;
      await localDb.organizations.put(defaultOrg);
      list.push(defaultOrg);
      active = defaultOrg;
      setOrganizations([defaultOrg]);
    }

    if (active) {
      setCurrentOrg(active);
      localStorage.setItem(DEFAULT_ORG_ID_KEY, active.id);
      const mem = await localDb.memberships.where('org_id').equals(active.id).first();
      if (mem) {
        setRole(mem.role);
      } else {
        setRole('owner');
      }
    }
  }, [isLocalMode]);

  const loadCloudOrgs = useCallback(async () => {
    if (!user || !isSupabaseConfigured) return;

    try {
      // Fetch organizations where user is a member
      const { data: memberData, error: memberErr } = await supabase
        .from('memberships')
        .select('org_id, role, organizations(*)')
        .eq('user_id', user.id);

      if (memberErr) throw memberErr;

      const orgs: LocalOrganization[] = [];
      let userRole = 'owner';

      if (memberData && memberData.length > 0) {
        for (const item of memberData) {
          const o = item.organizations as any;
          if (o) {
            const orgObj: LocalOrganization = {
              ...o,
              org_id: o.id,
              syncStatus: 'synced',
            };
            orgs.push(orgObj);
            await localDb.organizations.put(orgObj);
          }
        }

        const savedOrgId = localStorage.getItem(DEFAULT_ORG_ID_KEY);
        const active = orgs.find((o) => o.id === savedOrgId) || orgs[0];

        const activeMembership = memberData.find((m) => m.org_id === active.id);
        if (activeMembership) {
          userRole = activeMembership.role;
        }

        setOrganizations(orgs);
        setCurrentOrg(active);
        setRole(userRole);
        localStorage.setItem(DEFAULT_ORG_ID_KEY, active.id);
      }
    } catch (e) {
      console.warn('Could not load cloud organizations:', e);
      await loadLocalOrgs();
    }
  }, [user, loadLocalOrgs]);

  const reloadOrganizations = useCallback(async () => {
    setIsLoading(true);
    if (user && isSupabaseConfigured) {
      await loadCloudOrgs();
    } else {
      await loadLocalOrgs();
    }
    setIsLoading(false);
  }, [user, loadCloudOrgs, loadLocalOrgs]);

  useEffect(() => {
    reloadOrganizations();
  }, [reloadOrganizations]);

  // Periodic sync runner with current org ID
  useEffect(() => {
    syncEngine.startPeriodicSync(() => currentOrg?.id);
    return () => syncEngine.stopPeriodicSync();
  }, [currentOrg]);

  const createBusiness = async (
    name: string,
    businessType = 'other',
    currency = 'INR',
    country = 'India',
    weekStart = 1
  ) => {
    try {
      const newOrgId = generateUUID();
      const newOrg: LocalOrganization = {
        id: newOrgId,
        org_id: newOrgId,
        name,
        business_type: businessType,
        currency,
        country,
        week_start: weekStart,
        settings: {
          terminology_preset: (businessType as any) || 'general',
          month_calc_mode: 'actual',
        },
        owner_id: user?.id || 'local_user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        revision: 1,
        syncStatus: 'local-only',
      };

      // 1. Always store locally in Dexie first (Local-first architecture)
      await localDb.organizations.put(newOrg);

      // 2. Add owner membership locally
      await localDb.memberships.put({
        id: generateUUID(),
        org_id: newOrgId,
        user_id: user?.id || 'local_user',
        role: 'owner',
        assigned_site_ids: [],
        status: 'active',
        created_at: new Date().toISOString(),
        syncStatus: 'local-only',
      });

      let finalOrgId = newOrgId;

      // 3. If online and Supabase user session exists, try creating in cloud
      if (user && isSupabaseConfigured) {
        try {
          const { data: cloudOrgId, error: rpcErr } = await supabase.rpc('create_organization', {
            p_name: name,
            p_business_type: businessType,
            p_currency: currency,
            p_country: country,
          });

          if (!rpcErr && cloudOrgId) {
            finalOrgId = cloudOrgId;
            newOrg.id = cloudOrgId;
            newOrg.org_id = cloudOrgId;
            newOrg.syncStatus = 'synced';
            await localDb.organizations.put(newOrg);
            await localDb.memberships.put({
              id: generateUUID(),
              org_id: cloudOrgId,
              user_id: user.id,
              role: 'owner',
              assigned_site_ids: [],
              status: 'active',
              created_at: new Date().toISOString(),
              syncStatus: 'synced',
            });
          }
        } catch (cloudErr) {
          console.warn('Cloud organization creation failed, kept local:', cloudErr);
        }
      }

      // 4. Update states immediately so UI switches without delay
      localStorage.setItem(DEFAULT_ORG_ID_KEY, finalOrgId);
      setCurrentOrg(newOrg);
      setRole('owner');
      setOrganizations((prev) => {
        const withoutNew = prev.filter((o) => o.id !== finalOrgId && o.id !== newOrgId);
        return [...withoutNew, newOrg];
      });

      // Background reload
      reloadOrganizations();
      return { error: null, orgId: finalOrgId };
    } catch (err: any) {
      console.error('Failed to create business:', err);
      return { error: err };
    }
  };

  const joinWithInvite = async (code: string) => {
    try {
      const res = await processInviteAcceptance(code, user?.id);
      if (res.error) {
        return { error: res.error };
      }

      if (res.orgId) {
        localStorage.setItem(DEFAULT_ORG_ID_KEY, res.orgId);
        await reloadOrganizations();
        await switchBusiness(res.orgId);
        syncEngine.syncNow(res.orgId);
        return { error: null, orgId: res.orgId };
      }

      return { error: new Error('Failed to join business with invite code.') };
    } catch (err: any) {
      return { error: err };
    }
  };

  const switchBusiness = async (orgId: string) => {
    let found = organizations.find((o) => o.id === orgId);
    if (!found) {
      found = await localDb.organizations.get(orgId);
    }
    if (found) {
      setCurrentOrg(found);
      localStorage.setItem(DEFAULT_ORG_ID_KEY, found.id);

      const mem = await localDb.memberships.where('org_id').equals(found.id).first();
      if (mem) {
        setRole(mem.role);
      } else if (found.owner_id === (user?.id || 'local_user')) {
        setRole('owner');
      }

      syncEngine.syncNow(found.id);
    }
  };

  const updateSettings = async (updates: Partial<LocalOrganization> & { settings?: BusinessSettings }) => {
    if (!currentOrg) return { error: new Error('No business active') };

    try {
      const updatedData: LocalOrganization = {
        ...currentOrg,
        ...updates,
        settings: {
          ...currentOrg.settings,
          ...(updates.settings || {}),
        },
        updated_at: new Date().toISOString(),
      };

      await localDb.organizations.put(updatedData);
      setCurrentOrg(updatedData);

      if (user && isSupabaseConfigured) {
        const { error } = await supabase
          .from('organizations')
          .update({
            name: updatedData.name,
            currency: updatedData.currency,
            country: updatedData.country,
            week_start: updatedData.week_start,
            settings: updatedData.settings,
            logo_path: updatedData.logo_path,
            updated_at: updatedData.updated_at,
          })
          .eq('id', currentOrg.id);

        if (error) throw error;
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const upgradeLocalToCloud = async () => {
    if (!user || !isSupabaseConfigured) {
      return { error: new Error('Please sign in before upgrading to the cloud.') };
    }

    try {
      // Find local-only organizations
      const localOrgs = await localDb.organizations.where('syncStatus').equals('local-only').toArray();
      let migratedCount = 0;

      for (const lOrg of localOrgs) {
        // Create cloud org with RPC
        const { data: cloudOrgId, error: rpcErr } = await supabase.rpc('create_organization', {
          p_name: lOrg.name,
          p_business_type: lOrg.business_type,
          p_currency: lOrg.currency,
          p_country: lOrg.country,
        });

        if (rpcErr) throw rpcErr;

        if (cloudOrgId) {
          // Remap local records belonging to old lOrg.id to cloudOrgId
          const staffMembers = await localDb.staff.where('org_id').equals(lOrg.id).toArray();
          for (const s of staffMembers) {
            await localDb.staff.update(s.id, { org_id: cloudOrgId, syncStatus: 'pending' });
          }

          const attendanceList = await localDb.attendance_entries.where('org_id').equals(lOrg.id).toArray();
          for (const a of attendanceList) {
            await localDb.attendance_entries.update(a.id, { org_id: cloudOrgId, syncStatus: 'pending' });
          }

          const paymentsList = await localDb.payments.where('org_id').equals(lOrg.id).toArray();
          for (const p of paymentsList) {
            await localDb.payments.update(p.id, { org_id: cloudOrgId, syncStatus: 'pending' });
          }

          // Mark local organization as synced with cloudOrgId
          await localDb.organizations.delete(lOrg.id);
          migratedCount++;
        }
      }

      await reloadOrganizations();
      await syncEngine.syncNow(currentOrg?.id);
      return { error: null, count: migratedCount };
    } catch (err: any) {
      return { error: err };
    }
  };

  const deleteBusiness = async (orgId: string, onProgress?: (msg: string) => void) => {
    try {
      if (user && isSupabaseConfigured) {
        // 1. Verify ownership
        const orgToDelete = organizations.find((o) => o.id === orgId);
        if (orgToDelete && orgToDelete.owner_id !== user.id) {
          throw new Error('Only the business owner can delete this business.');
        }

        // 2. Check for other members
        onProgress?.('Verifying business memberships...');
        const { data: members, error: memErr } = await supabase
          .from('memberships')
          .select('id, user_id')
          .eq('org_id', orgId);

        if (memErr) throw memErr;

        const otherMembers = (members || []).filter((m) => m.user_id !== user.id);
        if (otherMembers.length > 0) {
          throw new Error('Please transfer ownership or remove other members before deleting this business.');
        }

        // 3. Remove all files under {orgId}/ first!
        onProgress?.('Cleaning up business files from storage...');
        const cleanupRes = await deleteOrgStorageFiles(orgId, onProgress);
        if (!cleanupRes.success || cleanupRes.error) {
          throw new Error(`File cleanup failed: ${cleanupRes.error?.message}. Business deletion cancelled.`);
        }

        // 4. Delete organization
        onProgress?.('Deleting business record...');
        const { error: delErr } = await supabase.from('organizations').delete().eq('id', orgId);
        if (delErr) throw delErr;

        // Clean audit log
        await supabase.from('audit_log').delete().eq('org_id', orgId);
      }

      // Remove from local database
      await localDb.organizations.delete(orgId);
      await localDb.staff.where('org_id').equals(orgId).delete();
      await localDb.staff_compensation.where('org_id').equals(orgId).delete();
      await localDb.attendance_entries.where('org_id').equals(orgId).delete();
      await localDb.work_entries.where('org_id').equals(orgId).delete();
      await localDb.payments.where('org_id').equals(orgId).delete();

      await reloadOrganizations();
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        organizations,
        role,
        isLoading,
        createBusiness,
        joinWithInvite,
        switchBusiness,
        updateSettings,
        reloadOrganizations,
        upgradeLocalToCloud,
        deleteBusiness,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
};

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
