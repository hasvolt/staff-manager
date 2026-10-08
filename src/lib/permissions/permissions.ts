export type UserRole = 'owner' | 'manager' | 'supervisor' | 'accountant' | 'viewer';

export interface RolePermissions {
  canManageMembers: boolean;
  canManageSettings: boolean;
  canEditStaff: boolean;
  canMarkAttendance: boolean;
  canLogWork: boolean;
  canManagePayments: boolean;
  canViewPayments: boolean;
  canExportReports: boolean;
  canPermanentDelete: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    canManageMembers: true,
    canManageSettings: true,
    canEditStaff: true,
    canMarkAttendance: true,
    canLogWork: true,
    canManagePayments: true,
    canViewPayments: true,
    canExportReports: true,
    canPermanentDelete: true,
  },
  manager: {
    canManageMembers: true,
    canManageSettings: false,
    canEditStaff: true,
    canMarkAttendance: true,
    canLogWork: true,
    canManagePayments: true,
    canViewPayments: true,
    canExportReports: true,
    canPermanentDelete: false,
  },
  supervisor: {
    canManageMembers: false,
    canManageSettings: false,
    canEditStaff: false,
    canMarkAttendance: true,
    canLogWork: true,
    canManagePayments: false,
    canViewPayments: false,
    canExportReports: false,
    canPermanentDelete: false,
  },
  accountant: {
    canManageMembers: false,
    canManageSettings: false,
    canEditStaff: false,
    canMarkAttendance: false,
    canLogWork: false,
    canManagePayments: true,
    canViewPayments: true,
    canExportReports: true,
    canPermanentDelete: false,
  },
  viewer: {
    canManageMembers: false,
    canManageSettings: false,
    canEditStaff: false,
    canMarkAttendance: false,
    canLogWork: false,
    canManagePayments: false,
    canViewPayments: false, // Can be toggled by owner setting
    canExportReports: false,
    canPermanentDelete: false,
  },
};

export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return !!ROLE_PERMISSIONS[role]?.[permission];
}
