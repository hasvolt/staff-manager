/**
 * CSV & Excel Export Utility with UTF-8 BOM
 * Ensures Hindi, Urdu, Tamil, and Unicode text opens correctly in Excel & Sheets
 */

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  // Add UTF-8 BOM (\uFEFF) so Excel respects UTF-8 encoding
  const BOM = '\uFEFF';

  const formatCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const csvContent =
    BOM +
    [
      headers.map(formatCell).join(','),
      ...rows.map((row) => row.map(formatCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Share text summary or download link via Web Share API or WhatsApp
 */
export async function shareSummary(
  title: string,
  text: string
): Promise<{ shared: boolean; method: 'native' | 'whatsapp' | 'clipboard' }> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title,
        text,
      });
      return { shared: true, method: 'native' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { shared: false, method: 'native' };
      }
    }
  }

  // Fallback to WhatsApp URL
  const encodedText = encodeURIComponent(`${title}\n\n${text}`);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;

  // Try opening WhatsApp in new window
  const opened = window.open(whatsappUrl, '_blank');
  if (opened) {
    return { shared: true, method: 'whatsapp' };
  }

  // Fallback to clipboard
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(`${title}\n\n${text}`);
    return { shared: true, method: 'clipboard' };
  }

  return { shared: false, method: 'clipboard' };
}
