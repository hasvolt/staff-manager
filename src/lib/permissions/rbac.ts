import { UserRole, ROLE_PERMISSIONS, RolePermissions, hasPermission } from './permissions';

export type RBACAction =
  | 'mark_attendance'
  | 'add_work'
  | 'view_staff'
  | 'edit_staff'
  | 'view_payments'
  | 'make_payments'
  | 'manage_settings'
  | 'manage_members'
  | 'export_reports'
  | 'permanent_delete';

export function canUserPerformAction(role: UserRole, action: RBACAction): boolean {
  switch (action) {
    case 'mark_attendance':
      return ROLE_PERMISSIONS[role].canMarkAttendance;
    case 'add_work':
      return ROLE_PERMISSIONS[role].canLogWork;
    case 'view_staff':
      return true; // All roles can view staff
    case 'edit_staff':
      return ROLE_PERMISSIONS[role].canEditStaff;
    case 'view_payments':
      return ROLE_PERMISSIONS[role].canViewPayments;
    case 'make_payments':
      return ROLE_PERMISSIONS[role].canManagePayments;
    case 'manage_settings':
      return ROLE_PERMISSIONS[role].canManageSettings;
    case 'manage_members':
      return ROLE_PERMISSIONS[role].canManageMembers;
    case 'export_reports':
      return ROLE_PERMISSIONS[role].canExportReports;
    case 'permanent_delete':
      return ROLE_PERMISSIONS[role].canPermanentDelete;
    default:
      return false;
  }
}

export type { UserRole, RolePermissions };
export { ROLE_PERMISSIONS, hasPermission };
