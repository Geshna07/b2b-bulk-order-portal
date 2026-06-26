/**
 * Invoice Generation using jsPDF
 */

export async function generateInvoice(order, items) {
  if (!window.jspdf) {
    if (window.toast) window.toast.show("PDF library not loaded", "error");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Colors
  const brandColor = [0, 166, 81];
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(brandColor[0], brandColor[1], brandColor[2]);
  doc.text("GANGA MAXX", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text("Ganga Maxx General Trading LLC", 14, 27);
  doc.text("123 Industrial Area, Dubai, UAE", 14, 32);
  doc.text("TRN: 100234567890123", 14, 37);
  
  // Invoice Details (Right Side)
  doc.setFontSize(16);
  doc.setTextColor(50);
  doc.setFont("helvetica", "bold");
  doc.text("TAX INVOICE", 150, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Invoice No: INV-${order.id.substring(0,8).toUpperCase()}`, 150, 27);
  
  const orderDate = order.createdAt ? (order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt)).toLocaleDateString() : new Date().toLocaleDateString();
  doc.text(`Date: ${orderDate}`, 150, 32);
  doc.text(`Status: ${order.status}`, 150, 37);
  
  // Line separator
  doc.setDrawColor(200);
  doc.line(14, 45, 196, 45);
  
  // Bill To
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("BILL TO:", 14, 55);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);
  doc.text(order.institutionName || 'Customer', 14, 62);
  doc.text(order.customerName || '', 14, 67);
  doc.text(order.shippingAddress || 'Address not provided', 14, 72, { maxWidth: 80 });
  
  // Table Setup manually (simple version without autoTable to avoid another dependency)
  let startY = 90;
  
  // Table Header
  doc.setFillColor(245, 245, 245);
  doc.rect(14, startY, 182, 10, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50);
  doc.text("Item / Description", 18, startY + 7);
  doc.text("Qty", 120, startY + 7);
  doc.text("Unit Price", 140, startY + 7);
  doc.text("Total", 170, startY + 7);
  
  // Table Rows
  startY += 15;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  
  let total = 0;
  
  if (items && items.length > 0) {
    items.forEach((item, index) => {
      // Handle pagination if needed
      if (startY > 250) {
        doc.addPage();
        startY = 20;
      }
      
      const itemTotal = (item.quantity * item.price);
      total += itemTotal;
      
      doc.text(item.name || 'Product', 18, startY, { maxWidth: 90 });
      doc.text(item.quantity.toString(), 120, startY);
      doc.text(`AED ${item.price.toFixed(2)}`, 140, startY);
      doc.text(`AED ${itemTotal.toFixed(2)}`, 170, startY);
      
      startY += 10;
      
      doc.setDrawColor(240);
      doc.line(14, startY - 5, 196, startY - 5);
    });
  } else {
    doc.text("No items data available.", 18, startY);
    startY += 10;
    total = order.totalAmount || 0;
  }
  
  // Totals
  startY += 5;
  
  const subtotal = total / 1.05; // Assuming 5% VAT included for UAE
  const vat = total - subtotal;
  
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal:", 140, startY);
  doc.text(`AED ${subtotal.toFixed(2)}`, 170, startY);
  
  startY += 8;
  doc.text("VAT (5%):", 140, startY);
  doc.text(`AED ${vat.toFixed(2)}`, 170, startY);
  
  startY += 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text("GRAND TOTAL:", 125, startY);
  doc.text(`AED ${total.toFixed(2)}`, 170, startY);
  
  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text("Thank you for your business!", 105, 275, { align: "center" });
  doc.text("Payment is due within standard credit terms. For inquiries, contact support@gangamaxx.com", 105, 280, { align: "center" });
  
  // Save PDF
  doc.save(`Invoice_INV-${order.id.substring(0,8)}.pdf`);
  
  if (window.toast) window.toast.show("Invoice downloaded successfully", "success");
}
