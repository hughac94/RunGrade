import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePDFReport(elementId = 'main-report-content') {
  const element = document.getElementById(elementId);
  if (!element) {
    alert('Could not find report content to export.');
    return;
  }

  // Take a screenshot of the element
  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL('image/jpeg', 1.0);

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height]
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
  pdf.save('RunGrade_Report.pdf');
}