import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { localDb, OutboxItem } from '@/lib/db/dexie';
import { getDeviceId } from '@/lib/db/repository';

export type SyncState = 'synced' | 'syncing' | 'offline' | 'error';

class SyncEngine {
  private syncState: SyncState = 'synced';
  private lastError: string | null = null;
  private listeners: Set<(state: SyncState, error?: string | null) => void> = new Set();
  private timer: any = null;
  private isSyncing = false;

  private SYNC_TABLES = [
    'sites',
    'work_types',
    'custom_field_defs',
    'staff',
    'attendance_entries',
    'work_entries',
    'payments',
    'period_closings',
  ];

  public subscribe(listener: (state: SyncState, error?: string | null) => void) {
    this.listeners.add(listener);
    listener(this.syncState, this.lastError);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.syncState, this.lastError));
  }

  public getState(): SyncState {
    return this.syncState;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public async syncNow(orgId?: string): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: true, message: 'Sync already in progress' };
    }

    if (!navigator.onLine) {
      this.syncState = 'offline';
      this.notify();
      return { success: false, message: 'Device is offline' };
    }

    if (!isSupabaseConfigured) {
      this.syncState = 'synced';
      this.notify();
      return { success: true, message: 'Local mode active' };
    }

    this.isSyncing = true;
    this.syncState = 'syncing';
    this.lastError = null;
    this.notify();

    try {
      // 1. Push Outbox
      await this.pushOutbox();

      // 2. Pull incremental changes if orgId is provided
      if (orgId) {
        await this.pullIncremental(orgId);
      }

      this.syncState = 'synced';
      this.notify();
      return { success: true, message: 'Sync complete' };
    } catch (err: any) {
      console.warn('Sync failed:', err);
      this.syncState = 'error';
      this.lastError = err?.message || 'Sync failed';
      this.notify();
      return { success: false, message: this.lastError || 'Sync failed' };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushOutbox() {
    const items = await localDb.outbox.orderBy('created_at').limit(50).toArray();
    for (const item of items) {
      try {
        const { error } = await supabase
          .from(item.table_name)
          .upsert(item.payload, { onConflict: 'id' });

        if (error) {
          // If conflict or permission issue
          if (error.code === '42501' || error.message.includes('permission')) {
            throw new Error(`Permission denied for ${item.table_name}: ${error.message}`);
          }
          throw error;
        }

        // On success, update local syncStatus to synced and delete from outbox
        const table = (localDb as any)[item.table_name];
        if (table) {
          await table.update(item.record_id, { syncStatus: 'synced' });
        }
        await localDb.outbox.delete(item.id);
      } catch (err: any) {
        // Record attempts and error for retry with backoff
        await localDb.outbox.update(item.id, {
          attempts: item.attempts + 1,
          error: err?.message || 'Unknown push error',
        });
        throw err;
      }
    }
  }

  private async pullIncremental(orgId: string) {
    for (const tableName of this.SYNC_TABLES) {
      const cursor = await localDb.sync_cursors.get(tableName);
      const lastPulledAt = cursor?.last_pulled_at || '1970-01-01T00:00:00Z';

      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('org_id', orgId)
        .gt('updated_at', lastPulledAt)
        .order('updated_at', { ascending: true })
        .limit(200);

      if (error) throw error;

      if (data && data.length > 0) {
        const table = (localDb as any)[tableName];
        if (table) {
          for (const row of data) {
            const localExisting = await table.get(row.id);
            // Conflict check: if local has unpushed changes with newer revision
            if (localExisting && localExisting.syncStatus === 'pending') {
              if (localExisting.revision !== row.revision) {
                await localDb.conflicts.put({
                  id: `${tableName}-${row.id}`,
                  org_id: orgId,
                  table_name: tableName,
                  record_id: row.id,
                  client_data: localExisting,
                  server_data: row,
                  status: 'pending',
                  detected_at: new Date().toISOString(),
                });
              }
            } else {
              await table.put({ ...row, syncStatus: 'synced' });
            }
          }
        }

        const latestRecord = data[data.length - 1];
        await localDb.sync_cursors.put({
          table_name: tableName,
          last_pulled_at: latestRecord.updated_at,
        });
      }
    }
  }

  public async registerDevice(userId: string, orgId?: string) {
    if (!isSupabaseConfigured || !navigator.onLine) return;
    const deviceId = getDeviceId();
    const platform = typeof navigator !== 'undefined' ? navigator.platform : 'web';
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'browser';

    try {
      await supabase.from('devices').upsert({
        id: deviceId,
        user_id: userId,
        org_id: orgId || null,
        name: userAgent.slice(0, 50),
        platform,
        last_seen_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Device registration skipped:', e);
    }
  }

  public startPeriodicSync(getOrgId: () => string | undefined) {
    if (this.timer) clearInterval(this.timer);

    const runSync = () => {
      const orgId = getOrgId();
      this.syncNow(orgId);
    };

    window.addEventListener('online', runSync);
    window.addEventListener('focus', runSync);

    // Sync every 3 minutes
    this.timer = setInterval(runSync, 3 * 60 * 1000);
  }

  public stopPeriodicSync() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const syncEngine = new SyncEngine();
