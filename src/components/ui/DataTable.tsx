import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  emptyText?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyText = 'No records found',
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs ${className}`}>
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`py-3 px-4 font-semibold text-xs tracking-wider uppercase text-[var(--text-muted)] select-none ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-xs sm:text-sm text-[var(--text-muted)]"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                className="hover:bg-[var(--surface-2)]/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 text-xs sm:text-sm text-[var(--text)] ${
                      col.align === 'right'
                        ? 'text-right font-mono'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row, index) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
