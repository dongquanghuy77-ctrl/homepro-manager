'use client';

import { useState } from 'react';

interface Props {
  targetId: string;
  filename: string;
}

export function PdfExportButton({ targetId, filename }: Props) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    try {
      setIsExporting(true);
      const target = document.getElementById(targetId);
      if (!target) {
        alert('Không tìm thấy vùng dữ liệu để xuất PDF');
        return;
      }

      // Add a temporary class to fix printing layout if needed
      target.classList.add('exporting-pdf');

      // Dynamically import to avoid SSR issues
      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      const canvas = await html2canvas(target, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      target.classList.remove('exporting-pdf');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let position = 0;
      let heightLeft = pdfHeight;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Add new pages if the content is longer than one A4 page
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Lỗi xuất PDF:', error);
      alert('Đã xảy ra lỗi khi xuất PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={exportPdf}
      disabled={isExporting}
      style={{
        background: '#ffffff',
        color: '#1a56a0',
        border: 'none',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: isExporting ? 'wait' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
    >
      {isExporting ? '⏳ Đang tạo PDF...' : '📄 Xuất PDF'}
    </button>
  );
}
