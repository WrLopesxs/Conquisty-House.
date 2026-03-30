export async function exportDashboardPDF({ corretor }) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm"),
    import("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm")
  ]);

  const target = document.getElementById("pdfTarget") || document.body;
  const canvas = await html2canvas(target, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const pageWidth = 297;
  const pageHeight = 210;
  const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
  const w = canvas.width * ratio;
  const h = canvas.height * ratio;

  pdf.setFontSize(11);
  pdf.text(`Conquist House CRM - ${corretor}`, 10, 10);
  pdf.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 10, 16);
  pdf.addImage(imgData, "PNG", (pageWidth - w) / 2, 20, w, h - 18);
  pdf.save(`dashboard-${corretor.toLowerCase()}.pdf`);
}
