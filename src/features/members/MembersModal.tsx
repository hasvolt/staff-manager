import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useOrg } from '@/features/org/orgContext';
import { useAuth } from '@/features/auth/authContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { localDb, LocalMembership, LocalSite } from '@/lib/db/dexie';
import { canRoleInviteRole } from '@/lib/permissions/rbac';
import { createInviteCode, revokeInviteCode, getStoredLocalInvites } from '@/lib/invites/inviteStore';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Clock,
  Laptop,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InviteRecord {
  id: string;
  code: string;
  role: string;
  assigned_site_ids: string[];
  expires_at: string;
  max_uses: number;
  used_count: number;
  revoked_at?: string | null;
  created_at: string;
}

interface DeviceRecord {
  id: string;
  user_id: string;
  name: string;
  platform: string;
  last_seen_at: string;
}

export const MembersModal: React.FC<MembersModalProps> = ({ isOpen, onClose }) => {
  const { currentOrg, role: myRole, reloadOrganizations } = useOrg();
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'members' | 'invites' | 'devices'>('members');

  // Members list
  const [members, setMembers] = useState<LocalMembership[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, { full_name?: string; email?: string }>>({});
  const [sites, setSites] = useState<LocalSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite creation state
  const [inviteRole, setInviteRole] = useState<'manager' | 'supervisor' | 'accountant' | 'viewer'>('supervisor');
  const [inviteMaxUses, setInviteMaxUses] = useState(1);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [activeInvites, setActiveInvites] = useState<InviteRecord[]>([]);

  // Devices list
  const [devices, setDevices] = useState<DeviceRecord[]>([]);

  // Transfer ownership dialog
  const [transferTargetUser, setTransferTargetUser] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Copied invite feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isOwner = myRole === 'owner';
  const isManager = myRole === 'manager';

  const loadData = async () => {
    if (!currentOrg?.id) return;
    setIsLoading(true);

    try {
      // 1. Load memberships
      const localMembers = await localDb.memberships.where('org_id').equals(currentOrg.id).toArray();
      setMembers(localMembers);

      // 2. Load sites for supervisor assignment
      const s = await localDb.sites.where('org_id').equals(currentOrg.id).filter((x) => !x.deleted_at).toArray();
      setSites(s);

      // Load local stored invites
      const localInv = getStoredLocalInvites(currentOrg.id);
      setActiveInvites(localInv);

      // If cloud configured, fetch cloud data
      if (isSupabaseConfigured && user) {
        // Fetch memberships from supabase
        const { data: cloudMems } = await supabase
          .from('memberships')
          .select('*, profiles(id, full_name, phone)')
          .eq('org_id', currentOrg.id);

        if (cloudMems && cloudMems.length > 0) {
          const profileMap: Record<string, { full_name?: string; email?: string }> = {};
          cloudMems.forEach((m: any) => {
            profileMap[m.user_id] = {
              full_name: m.profiles?.full_name || 'Team Member',
            };
          });
          setMemberProfiles(profileMap);
          setMembers(cloudMems);
          // Sync into localDb
          for (const m of cloudMems) {
            await localDb.memberships.put({
              id: m.id,
              org_id: m.org_id,
              user_id: m.user_id,
              role: m.role,
              assigned_site_ids: m.assigned_site_ids || [],
              status: m.status || 'active',
              created_at: m.created_at,
              syncStatus: 'synced',
            });
          }
        }

        // Fetch cloud invites
        try {
          const { data: invData } = await supabase
            .from('invites')
            .select('*')
            .eq('org_id', currentOrg.id)
            .is('revoked_at', null)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false });

          if (invData && invData.length > 0) {
            const cloudCodes = new Set(invData.map((x: any) => x.code));
            const remainingLocal = localInv.filter((x) => !cloudCodes.has(x.code));
            setActiveInvites([...invData, ...remainingLocal]);
          }
        } catch (invLoadErr) {
          console.warn('Could not load cloud invites, using local:', invLoadErr);
        }

        // Fetch devices
        const { data: devData } = await supabase
          .from('devices')
          .select('*')
          .order('last_seen_at', { ascending: false });

        if (devData) {
          setDevices(devData);
        }
      }
    } catch (e: any) {
      console.warn('Failed to load team data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentOrg]);

  // Create invite link / code
  const handleCreateInvite = async () => {
    if (!currentOrg?.id) {
      error('No active business selected.');
      return;
    }

    const effectiveRole = currentOrg.owner_id === (user?.id || 'local_user') ? 'owner' : (myRole || 'owner');
    if (!canRoleInviteRole(effectiveRole as any, inviteRole as any)) {
      error(`Your role (${effectiveRole}) cannot invite a ${inviteRole}.`);
      return;
    }

    setIsCreatingInvite(true);
    try {
      const { code, invite, source } = await createInviteCode({
        orgId: currentOrg.id,
        orgName: currentOrg.name,
        role: inviteRole,
        assignedSiteIds: inviteRole === 'supervisor' ? selectedSiteIds : [],
        maxUses: inviteMaxUses,
        userId: user?.id,
      });

      setActiveInvites((prev) => [invite, ...prev.filter((i) => i.code !== code)]);
      success(`Invite code generated: ${code}`);

      if (source === 'cloud') {
        loadData();
      }
    } catch (err: any) {
      console.error('Invite generation error:', err);
      error(err.message || 'Failed to create invite.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invite code immediately?')) return;
    try {
      await revokeInviteCode(inviteId);
      setActiveInvites((prev) => prev.filter((i) => i.id !== inviteId && i.code !== inviteId));
      success('Invite code revoked.');
    } catch (e: any) {
      error(e.message || 'Failed to revoke invite');
    }
  };

  const handleCopyInvite = (code: string) => {
    const inviteUrl = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedCode(code);
    success('Invite link copied to clipboard!');
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleUpdateRole = async (memberUserId: string, newRole: string) => {
    if (!isOwner) {
      error('Only the business owner can change member roles.');
      return;
    }
    try {
      if (isSupabaseConfigured) {
        const { error: upErr } = await supabase
          .from('memberships')
          .update({ role: newRole })
          .eq('org_id', currentOrg?.id)
          .eq('user_id', memberUserId);
        if (upErr) throw upErr;
      }
      await localDb.memberships
        .where('org_id')
        .equals(currentOrg?.id || '')
        .filter((m) => m.user_id === memberUserId)
        .modify({ role: newRole as any });

      success(`Member role updated to ${newRole}`);
      loadData();
    } catch (e: any) {
      error(e.message || 'Failed to update member role');
    }
  };

  const handleRemoveMember = async (memberUserId: string, memberRole: string) => {
    if (memberRole === 'owner') {
      error('Cannot remove the owner. Transfer ownership first.');
      return;
    }
    if (!isOwner && !(isManager && ['supervisor', 'accountant', 'viewer'].includes(memberRole))) {
      error('You do not have permission to remove this member.');
      return;
    }

    if (!confirm('Remove this member from the organization? They will immediately lose access.')) return;

    try {
      if (isSupabaseConfigured) {
        const { error: delErr } = await supabase
          .from('memberships')
          .delete()
          .eq('org_id', currentOrg?.id)
          .eq('user_id', memberUserId);
        if (delErr) throw delErr;
      }
      await localDb.memberships
        .where('org_id')
        .equals(currentOrg?.id || '')
        .filter((m) => m.user_id === memberUserId)
        .delete();

      success('Member removed.');
      loadData();
    } catch (e: any) {
      error(e.message || 'Failed to remove member');
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferTargetUser || !currentOrg?.id) return;
    if (!confirm('Are you ABSOLUTELY SURE you want to transfer ownership? You will be demoted to Manager.')) return;

    setIsTransferring(true);
    try {
      if (isSupabaseConfigured) {
        const { error: tErr } = await supabase.rpc('transfer_organization_ownership', {
          p_org: currentOrg.id,
          p_target_user: transferTargetUser,
        });
        if (tErr) throw tErr;
      }

      success('Ownership transferred successfully.');
      setTransferTargetUser(null);
      await reloadOrganizations();
      loadData();
    } catch (e: any) {
      error(e.message || 'Ownership transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Team & Access Control" maxWidth="lg">
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[var(--border)] gap-2 pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'members'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Members ({members.length})</span>
          </button>
          {(isOwner || isManager) && (
            <button
              type="button"
              onClick={() => setActiveTab('invites')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeTab === 'invites'
                  ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Links ({activeInvites.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'devices'
                ? 'bg-[var(--accent)] text-[var(--accent-contrast)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Devices</span>
          </button>
        </div>

        {/* 1. MEMBERS LIST */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface-2)]/30">
              {members.map((m) => {
                const profile = memberProfiles[m.user_id];
                const isMe = m.user_id === user?.id;
                return (
                  <div key={m.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text)]">
                          {profile?.full_name || (isMe ? 'You' : `User ${m.user_id.slice(0, 6)}`)}
                        </span>
                        {isMe && (
                          <span className="text-[10px] font-bold uppercase bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-[var(--accent)]">
                            You
                          </span>
                        )}
                        <Badge
                          variant={
                            m.role === 'owner'
                              ? 'accent'
                              : m.role === 'manager'
                              ? 'secondary'
                              : m.role === 'accountant'
                              ? 'success'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {m.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Joined {new Date(m.created_at).toLocaleDateString()} &bull; Status: {m.status}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isOwner && !isMe && m.role !== 'owner' && (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.user_id, e.target.value)}
                          className="text-xs bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] rounded-lg px-2 py-1"
                        >
                          <option value="manager">Manager</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="accountant">Accountant</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}

                      {isOwner && !isMe && m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => setTransferTargetUser(m.user_id)}
                          title="Transfer ownership to this member"
                          className="text-xs px-2 py-1 rounded border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 cursor-pointer"
                        >
                          Transfer Owner
                        </button>
                      )}

                      {!isMe && m.role !== 'owner' && (isOwner || isManager) && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.user_id, m.role)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Transfer ownership dialog */}
            {transferTargetUser && (
              <div className="p-3.5 rounded-xl border border-amber-500/50 bg-amber-500/10 space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Confirm Ownership Transfer</span>
                </div>
                <p className="text-xs text-[var(--text)]">
                  Are you sure you want to transfer primary ownership? You will remain a Manager, and the selected member will gain absolute control.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button variant="expense" size="sm" onClick={handleTransferOwnership} isLoading={isTransferring}>
                    Confirm Transfer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setTransferTargetUser(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. INVITE LINKS */}
        {activeTab === 'invites' && (
          <div className="space-y-4">
            {/* Create new invite box */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3">
              <h4 className="font-semibold text-xs text-[var(--text)] uppercase tracking-wider">
                Generate Invite Link / Code
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Assign Role">
                  <Select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    options={[
                      ...(isOwner ? [{ value: 'manager', label: 'Manager (Full operational access)' }] : []),
                      { value: 'supervisor', label: 'Supervisor (Attendance & Work only)' },
                      { value: 'accountant', label: 'Accountant (Payouts & Reports)' },
                      { value: 'viewer', label: 'Viewer (Read-only)' },
                    ]}
                  />
                </FormField>

                <FormField label="Maximum Uses">
                  <Select
                    value={String(inviteMaxUses)}
                    onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                    options={[
                      { value: '1', label: 'Single use (1 person)' },
                      { value: '5', label: 'Up to 5 team members' },
                      { value: '20', label: 'Up to 20 team members' },
                    ]}
                  />
                </FormField>
              </div>

              {inviteRole === 'supervisor' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
                      <span>Limit to Specific Sites / Projects</span>
                      <span className="text-[10px] font-normal text-[var(--text-muted)]">(Optional)</span>
                    </label>
                    {sites.length > 0 && (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {selectedSiteIds.length === 0
                          ? 'Can access all sites'
                          : `${selectedSiteIds.length} site(s) selected`}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    By default, Supervisors can mark attendance for all sites. If you select specific sites below, this supervisor will only see and manage staff assigned to those specific locations/projects.
                  </p>

                  {sites.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {sites.map((s) => {
                        const isSelected = selectedSiteIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setSelectedSiteIds(selectedSiteIds.filter((id) => id !== s.id));
                              } else {
                                setSelectedSiteIds([...selectedSiteIds, s.id]);
                              }
                            }}
                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-[var(--accent)] text-[var(--accent-contrast)] border-[var(--accent)] font-semibold shadow-xs'
                                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
                            }`}
                          >
                            <span>{s.name}</span>
                            {isSelected && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[11px] text-[var(--text-muted)]">
                      No sites added yet. Go to <strong>Settings &rarr; Sites / Projects</strong> to add construction sites, shops, or branches first.
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateInvite}
                isLoading={isCreatingInvite}
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Generate Invite Link
              </Button>
            </div>

            {/* Active Invites List */}
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-[var(--text-muted)] uppercase tracking-wider">
                Active Invites
              </h4>
              {activeInvites.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic">No active invite codes.</p>
              ) : (
                <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/20">
                  {activeInvites.map((inv) => (
                    <div key={inv.id} className="p-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-[var(--accent)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
                            {inv.code}
                          </span>
                          <Badge variant="neutral" size="sm">
                            Role: {inv.role}
                          </Badge>
                          <span className="text-[11px] text-[var(--text-muted)]">
                            Used: {inv.used_count}/{inv.max_uses}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1">
                          Expires: {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyInvite(inv.code)}
                        >
                          {copiedCode === inv.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy Link</span>
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition"
                          title="Revoke code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. REGISTERED DEVICES */}
        {activeTab === 'devices' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Authorized devices connected to your organization. Multiple devices can edit offline and merge safely.
            </p>
            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface-2)]/30">
              {devices.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                  Current device registered. Secondary devices will appear here after login.
                </div>
              ) : (
                devices.map((d) => (
                  <div key={d.id} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-xs text-[var(--text)] block truncate max-w-[200px] sm:max-w-xs">
                          {d.name || 'Web Browser'}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          Platform: {d.platform} &bull; Last seen: {new Date(d.last_seen_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-[var(--border)]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
