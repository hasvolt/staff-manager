import './setup';
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInviteCode,
  processInviteAcceptance,
  revokeInviteCode,
  getStoredLocalInvites,
  generateLocalCode,
} from '@/lib/invites/inviteStore';
import { localDb } from '@/lib/db/dexie';

describe('Invite Store and Business Joining System', () => {
  beforeEach(async () => {
    localStorage.clear();
    await localDb.organizations.clear();
    await localDb.memberships.clear();
  });

  it('generates a valid formatted local invite code', () => {
    const code = generateLocalCode();
    expect(code).toMatch(/^SM-[A-Z0-9]{6}$/);
  });

  it('creates an invite code, saves it persistently, and allows retrieving it', async () => {
    const orgId = 'test-org-123';
    const orgName = 'Khan Traders';
    const res = await createInviteCode({
      orgId,
      orgName,
      role: 'supervisor',
      assignedSiteIds: ['site-1', 'site-2'],
      maxUses: 2,
    });

    expect(res.code).toBeDefined();
    expect(res.code.length).toBeGreaterThan(5);
    expect(res.invite.org_id).toBe(orgId);
    expect(res.invite.role).toBe('supervisor');

    const invites = getStoredLocalInvites(orgId);
    expect(invites.length).toBe(1);
    expect(invites[0].code).toBe(res.code);
  });

  it('accepts a valid invite code and joins the business', async () => {
    const orgId = 'org-abc';
    const orgName = 'Metro Construction';

    // Seed organization in localDb
    await localDb.organizations.put({
      id: orgId,
      org_id: orgId,
      name: orgName,
      business_type: 'construction',
      currency: 'INR',
      week_start: 1,
      settings: {},
      owner_id: 'owner-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 1,
      syncStatus: 'local-only',
    });

    const createRes = await createInviteCode({
      orgId,
      orgName,
      role: 'accountant',
      assignedSiteIds: [],
      maxUses: 1,
    });

    const acceptRes = await processInviteAcceptance(createRes.code, 'user-joiner');
    expect(acceptRes.error).toBeNull();
    expect(acceptRes.orgId).toBe(orgId);
    expect(acceptRes.role).toBe('accountant');

    // Verify membership was recorded in Dexie
    const member = await localDb.memberships.where('org_id').equals(orgId).first();
    expect(member).toBeDefined();
    expect(member?.role).toBe('accountant');
    expect(member?.user_id).toBe('user-joiner');
  });

  it('rejects revoked or exhausted invite codes', async () => {
    const orgId = 'org-xyz';
    const createRes = await createInviteCode({
      orgId,
      orgName: 'Shop One',
      role: 'viewer',
      assignedSiteIds: [],
      maxUses: 1,
    });

    // Revoke code
    await revokeInviteCode(createRes.code);

    const acceptRes = await processInviteAcceptance(createRes.code, 'user-joiner');
    expect(acceptRes.error).toBeDefined();
    expect(acceptRes.error?.message).toContain('revoked');
  });
});
