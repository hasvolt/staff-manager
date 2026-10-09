/**
 * PDF Export Utility using jsPDF & jspdf-autotable
 * Lazy-loads heavy PDF libraries for optimum web bundle performance
 */

export interface PdfExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  businessName?: string;
  periodText?: string;
  notes?: string;
  headers: string[];
  rows: (string | number)[][];
  orientation?: 'portrait' | 'landscape';
  includeSignatures?: boolean;
  employerLabel?: string;
  employeeLabel?: string;
}

export async function exportToPdf(options: PdfExportOptions): Promise<any> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = autoTableModule.default || (autoTableModule as any);

  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Title
  let currentY = 16;

  if (options.businessName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text(options.businessName, margin, currentY);
    currentY += 6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(options.title, margin, currentY);
  currentY += 5;

  if (options.subtitle || options.periodText) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const sub = [options.subtitle, options.periodText].filter(Boolean).join(' | ');
    doc.text(sub, margin, currentY);
    currentY += 6;
  }

  // Draw separator line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // Generate AutoTable
  autoTable(doc, {
    startY: currentY,
    head: [options.headers],
    body: options.rows,
    margin: { left: margin, right: margin, bottom: 20 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawPage: (data: any) => {
      // Persistent Page Footer
      const totalPagesExp = '{total_pages_count_string}';
      const pageNumber = data.pageNumber;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      // Left footer: App branding & generation timestamp
      const nowStr = new Date().toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      doc.text(`Staff Manager - Generated on ${nowStr}`, margin, pageHeight - 10);

      // Right footer: Page numbers
      const pageText = `Page ${pageNumber} of ${totalPagesExp}`;
      doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 10);
    },
  });

  // Calculate final Y position after table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : currentY + 30;

  // Signatures if requested and space permits, or on new page if close to bottom
  if (options.includeSignatures) {
    let sigY = finalY;
    if (sigY + 25 > pageHeight - 20) {
      doc.addPage();
      sigY = 30;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    // Left signature: Employee
    doc.line(margin, sigY + 12, margin + 50, sigY + 12);
    doc.text(options.employeeLabel || 'Employee / Staff Signature', margin, sigY + 17);

    // Right signature: Employer / Manager
    const rightSigX = pageWidth - margin - 50;
    doc.line(rightSigX, sigY + 12, pageWidth - margin, sigY + 12);
    doc.text(options.employerLabel || 'Authorized Signatory', rightSigX, sigY + 17);
  }

  // Replace {total_pages_count_string} with actual page count
  if (typeof (doc as any).putTotalPages === 'function') {
    (doc as any).putTotalPages('{total_pages_count_string}');
  }

  // Save the document
  const finalFilename = options.filename.endsWith('.pdf') ? options.filename : `${options.filename}.pdf`;
  doc.save(finalFilename);
  return doc;
}
