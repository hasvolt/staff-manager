export type SyncStatus = 'local-only' | 'pending' | 'synced' | 'conflict';

export interface SyncedEntity {
  id: string;
  org_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  device_id?: string;
  revision: number;
  deleted_at?: string | null;
  syncStatus?: SyncStatus;
}
