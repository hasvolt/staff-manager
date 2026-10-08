import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, hasPermission, UserRole } from '@/lib/permissions/permissions';

describe('Role-Based Access Control (RBAC) & Security Policy Tests', () => {
  it('Owner has full permissions including member management and permanent delete', () => {
    expect(hasPermission('owner', 'canManageMembers')).toBe(true);
    expect(hasPermission('owner', 'canManageSettings')).toBe(true);
    expect(hasPermission('owner', 'canEditStaff')).toBe(true);
    expect(hasPermission('owner', 'canMarkAttendance')).toBe(true);
    expect(hasPermission('owner', 'canManagePayments')).toBe(true);
    expect(hasPermission('owner', 'canViewPayments')).toBe(true);
    expect(hasPermission('owner', 'canPermanentDelete')).toBe(true);
  });

  it('Supervisor is strictly barred from viewing or editing payments', () => {
    expect(hasPermission('supervisor', 'canMarkAttendance')).toBe(true);
    expect(hasPermission('supervisor', 'canLogWork')).toBe(true);
    expect(hasPermission('supervisor', 'canManagePayments')).toBe(false);
    expect(hasPermission('supervisor', 'canViewPayments')).toBe(false);
    expect(hasPermission('supervisor', 'canPermanentDelete')).toBe(false);
    expect(hasPermission('supervisor', 'canManageSettings')).toBe(false);
  });

  it('Accountant can manage payments and reports but cannot edit attendance or staff profiles', () => {
    expect(hasPermission('accountant', 'canManagePayments')).toBe(true);
    expect(hasPermission('accountant', 'canViewPayments')).toBe(true);
    expect(hasPermission('accountant', 'canExportReports')).toBe(true);
    expect(hasPermission('accountant', 'canMarkAttendance')).toBe(false);
    expect(hasPermission('accountant', 'canEditStaff')).toBe(false);
    expect(hasPermission('accountant', 'canPermanentDelete')).toBe(false);
  });

  it('Viewer is strictly read-only and cannot write data', () => {
    const writePermissions: (keyof typeof ROLE_PERMISSIONS['viewer'])[] = [
      'canManageMembers',
      'canManageSettings',
      'canEditStaff',
      'canMarkAttendance',
      'canLogWork',
      'canManagePayments',
      'canPermanentDelete',
    ];

    writePermissions.forEach((p) => {
      expect(hasPermission('viewer', p)).toBe(false);
    });
  });
});
