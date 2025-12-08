import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePDFReport(elementId = 'main-report-content') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Could not find report content to export.');
    return;
  }

  // Render element to canvas at higher scale for quality
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, scrollY: 0 });
  const imgData = canvas.toDataURL('image/jpeg', 0.98);

  // A4 portrait in px (using 96 DPI as base, jsPDF will scale)
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Scale image to fit page width, compute rendered height
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // If one page is enough, add and save
  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
    pdf.save('RunGrade_Report.pdf');
    return;
  }

  // Paginate: draw slices per page
  let remainingHeight = imgHeight;
  let sourceY = 0;
  const sliceHeightOnCanvas = (pageHeight * canvas.width) / pageWidth; // map pageHeight to canvas pixels

  while (remainingHeight > 0) {
    // Create a temp canvas for the current slice
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = Math.min(sliceHeightOnCanvas, canvas.height - sourceY);

    const ctx = pageCanvas.getContext('2d');
    ctx.drawImage(
      canvas,
      0, sourceY, pageCanvas.width, pageCanvas.height, // src rect
      0, 0, pageCanvas.width, pageCanvas.height        // dest rect
    );

    const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.98);
    const pageImgHeight = (pageCanvas.height * imgWidth) / pageCanvas.width;

    pdf.addImage(pageImgData, 'JPEG', 0, 0, imgWidth, pageImgHeight);

    remainingHeight -= pageHeight;
    sourceY += pageCanvas.height;

    if (remainingHeight > 0) pdf.addPage();
  }

  pdf.save('RunGrade_Report.pdf');
}