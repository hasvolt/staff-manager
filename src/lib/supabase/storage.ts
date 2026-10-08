import { supabase, isSupabaseConfigured } from './client';

/**
 * Removes all files in a specific organization directory under the private 'org-files' bucket in batches.
 * Returns { success: true } if all files are successfully removed, or { success: false, error } on failure.
 */
export async function deleteOrgStorageFiles(
  orgId: string,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; error: Error | null }> {
  if (!isSupabaseConfigured) {
    return { success: true, error: null };
  }

  try {
    onProgress?.(`Inspecting files in storage for organization ${orgId}...`);
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const { data: files, error: listErr } = await supabase.storage
        .from('org-files')
        .list(orgId, { limit, offset, sortBy: { column: 'name', order: 'asc' } });

      if (listErr) {
        return {
          success: false,
          error: new Error(`Failed to list storage files: ${listErr.message}`),
        };
      }

      if (!files || files.length === 0) {
        break;
      }

      const pathsToRemove: string[] = [];
      for (const item of files) {
        if (item.name && item.name !== '.emptyFolderPlaceholder') {
          pathsToRemove.push(`${orgId}/${item.name}`);
        }
      }

      if (pathsToRemove.length > 0) {
        onProgress?.(`Removing ${pathsToRemove.length} files from storage...`);
        const { error: removeErr } = await supabase.storage
          .from('org-files')
          .remove(pathsToRemove);

        if (removeErr) {
          return {
            success: false,
            error: new Error(`Failed to delete storage files: ${removeErr.message}`),
          };
        }
      }

      if (files.length < limit) {
        hasMore = false;
      } else {
        offset += files.length;
      }
    }

    onProgress?.('Storage files cleaned successfully.');
    return { success: true, error: null };
  } catch (err: any) {
    return {
      success: false,
      error: new Error(err?.message || 'Storage cleanup failed unexpectedly'),
    };
  }
}
