import { localDb, LocalStaff, LocalAttendanceEntry, LocalPayment } from '@/lib/db/dexie';
import { generateUUID } from '@/lib/db/repository';

export interface ImportPreviewRow {
  index: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
  isDuplicate?: boolean;
}

export interface ImportResult {
  totalRows: number;
  importedCount: number;
  batchId: string;
  createdIds: string[];
}

export function parseCSVText(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip BOM if present
  const clean = csvText.replace(/^\uFEFF/, '').trim();
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('CSV must contain a header row and at least one data row.');
  }

  // Parse CSV line handling quotes
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(obj);
  }

  return { headers, rows };
}

export function getStaffImportTemplateCSV(): string {
  const headers = ['name', 'phone', 'role_designation', 'payment_type', 'rate', 'staff_code'];
  const sample = [
    ['Rajesh Kumar', '+91 9876543210', 'Mistri', 'daily', '600', 'EMP001'],
    ['Amit Singh', '+91 9876543211', 'Helper', 'daily', '450', 'EMP002'],
    ['Sunil Sharma', '+91 9876543212', 'Electrician', 'monthly', '18000', 'EMP003'],
  ];
  return '\uFEFF' + [headers.join(','), ...sample.map((r) => r.join(','))].join('\r\n');
}

export async function validateStaffImport(
  orgId: string,
  rows: Record<string, string>[]
): Promise<ImportPreviewRow[]> {
  const existingStaff = await localDb.staff.where('org_id').equals(orgId).toArray();
  const existingPhones = new Set(existingStaff.map((s) => s.phone).filter(Boolean));
  const existingNames = new Set(existingStaff.map((s) => s.name.toLowerCase().trim()));

  return rows.map((r, index) => {
    const errors: string[] = [];
    const name = (r.name || r.full_name || '').trim();
    if (!name) {
      errors.push('Staff name is required.');
    }

    const paymentType = (r.payment_type || 'daily').toLowerCase().trim();
    if (!['daily', 'monthly', 'hourly', 'piece_unit'].includes(paymentType)) {
      errors.push('Payment type must be: daily, monthly, hourly, or piece_unit.');
    }

    const rate = parseFloat(r.rate || '0');
    if (isNaN(rate) || rate < 0) {
      errors.push('Rate must be a positive number or 0.');
    }

    const phone = (r.phone || '').trim();
    let isDuplicate = false;
    if (phone && existingPhones.has(phone)) {
      isDuplicate = true;
    } else if (name && existingNames.has(name.toLowerCase())) {
      isDuplicate = true;
    }

    return {
      index,
      data: {
        name,
        phone,
        designation: (r.role_designation || r.role || r.designation || '').trim(),
        payment_type: paymentType,
        rate,
        staff_code: (r.staff_code || r.code || '').trim(),
      },
      isValid: errors.length === 0,
      errors,
      isDuplicate,
    };
  });
}

export async function executeStaffImport(
  orgId: string,
  previewRows: ImportPreviewRow[]
): Promise<ImportResult> {
  const batchId = generateUUID();
  const createdIds: string[] = [];
  const now = new Date().toISOString();

  const validRows = previewRows.filter((r) => r.isValid);

  for (const row of validRows) {
    const staffId = generateUUID();
    const staffRecord: LocalStaff = {
      id: staffId,
      org_id: orgId,
      name: row.data.name,
      staff_code: row.data.staff_code || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: row.data.phone || null,
      role_title: row.data.designation || null,
      payment_type: (row.data.payment_type === 'piece_unit' ? 'piece' : row.data.payment_type) as any,
      weekly_off: [0], // Default Sunday
      joining_date: now.split('T')[0],
      status: 'active',
      created_at: now,
      updated_at: now,
      revision: 1,
      syncStatus: 'pending',
    };

    await localDb.staff.put(staffRecord);

    await localDb.staff_compensation.put({
      id: generateUUID(),
      org_id: orgId,
      staff_id: staffId,
      rate: row.data.rate || 0,
      rate_history: [],
      created_at: now,
      updated_at: now,
      revision: 1,
      syncStatus: 'pending',
    });

    createdIds.push(staffId);
  }

  // Save batch in app settings to allow rollback
  await localDb.app_settings.put({
    key: `import_batch_${batchId}`,
    value: {
      type: 'staff',
      orgId,
      createdIds,
      importedAt: now,
    },
  });

  return {
    totalRows: previewRows.length,
    importedCount: createdIds.length,
    batchId,
    createdIds,
  };
}

export async function rollbackImportBatch(batchId: string): Promise<number> {
  const setting = await localDb.app_settings.get(`import_batch_${batchId}`);
  if (!setting || !setting.value) {
    throw new Error('Batch record not found or already deleted.');
  }

  const { createdIds, type } = setting.value;
  let count = 0;
  if (type === 'staff') {
    for (const id of createdIds) {
      await localDb.staff.delete(id);
      await localDb.staff_compensation.where('staff_id').equals(id).delete();
      count++;
    }
  }

  await localDb.app_settings.delete(`import_batch_${batchId}`);
  return count;
}
