const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

/**
 * Generates an invoice PDF and saves it to uploads/invoices
 * @param {Object} invoice Invoice database record
 * @param {Object} po Purchase order database record
 * @param {Object} vendor Vendor database record
 * @returns {Promise<string>} Relative path to the generated PDF
 */
const generateInvoicePDF = (invoice, po, vendor) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const dir = path.join(__dirname, "../../uploads/invoices");

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filename = `${invoice.invoiceNumber}.pdf`;
      const pdfPath = path.join(dir, filename);
      const stream = fs.createWriteStream(pdfPath);

      doc.pipe(stream);

      // 1. Header Area
      const logoPath = path.join(__dirname, "../assets/logo.png");
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 45, { width: 40 });
        doc.fontSize(22).fillColor("#2563EB").text("VendorBridge ERP", 100, 50);
        doc.fontSize(9).fillColor("#6B7280").text("Procurement & Vendor Management Portal", 100, 75);
      } else {
        doc.fontSize(22).fillColor("#2563EB").text("VendorBridge ERP", 50, 50);
        doc.fontSize(9).fillColor("#6B7280").text("Procurement & Vendor Management Portal", 50, 75);
      }

      // Line separator
      doc.moveTo(50, 95).lineTo(550, 95).strokeColor("#E5E7EB").stroke();

      // 2. Invoice Details (Right-aligned)
      doc.fontSize(16).fillColor("#111827").text("INVOICE", 400, 50, { align: "right" });
      doc.fontSize(9).fillColor("#4B5563")
        .text(`Invoice No: ${invoice.invoiceNumber}`, 400, 75, { align: "right" })
        .text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`, 400, 90, { align: "right" })
        .text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 400, 105, { align: "right" })
        .text(`PO Reference: ${po.poNumber}`, 400, 120, { align: "right" });

      // 3. Billing Info (Left side)
      doc.fontSize(11).fillColor("#111827").text("Vendor Details (Bill From):", 50, 130);
      doc.fontSize(9).fillColor("#4B5563")
        .text(vendor.companyName, 50, 148, { font: "Helvetica-Bold" })
        .text(`Contact: ${vendor.contactPerson}`, 50, 162)
        .text(`Email: ${vendor.email}`, 50, 176)
        .text(`Phone: ${vendor.phone}`, 50, 190)
        .text(`GSTIN: ${vendor.gstNumber}`, 50, 204)
        .text(`Address: ${vendor.address}, ${vendor.city}, ${vendor.state} - ${vendor.pincode}`, 50, 218, { width: 300 });

      // Line separator
      doc.moveTo(50, 255).lineTo(550, 255).strokeColor("#E5E7EB").stroke();

      // 4. Items Table
      const tableTop = 275;
      doc.fontSize(10).fillColor("#111827")
        .text("Item / Service Description", 50, tableTop)
        .text("Quantity", 260, tableTop, { width: 70, align: "right" })
        .text("Unit Price (Rs)", 340, tableTop, { width: 80, align: "right" })
        .text("Tax (%)", 430, tableTop, { width: 45, align: "right" })
        .text("Total (Rs)", 480, tableTop, { width: 70, align: "right" });

      // Table divider line
      doc.moveTo(50, 290).lineTo(550, 290).strokeColor("#9CA3AF").stroke();

      const rowTop = 300;
      doc.fontSize(9).fillColor("#4B5563")
        .text(po.itemName || "Procured Item", 50, rowTop, { width: 200 })
        .text(po.quantity.toString(), 260, rowTop, { width: 70, align: "right" })
        .text(po.unitPrice.toFixed(2), 340, rowTop, { width: 80, align: "right" })
        .text(po.quotation?.taxPercentage?.toFixed(1) || "18.0", 430, rowTop, { width: 45, align: "right" })
        .text(invoice.amount.toFixed(2), 480, rowTop, { width: 70, align: "right" });

      // Table bottom line
      doc.moveTo(50, 335).lineTo(550, 335).strokeColor("#E5E7EB").stroke();

      // 5. Total Calculations (Right side)
      const calculationsY = 355;
      doc.fontSize(9).fillColor("#4B5563")
        .text("Subtotal:", 340, calculationsY, { width: 110, align: "right" })
        .text(`Rs. ${invoice.amount.toFixed(2)}`, 460, calculationsY, { width: 90, align: "right" })

        .text("Tax Amount:", 340, calculationsY + 18, { width: 110, align: "right" })
        .text(`Rs. ${invoice.taxAmount.toFixed(2)}`, 460, calculationsY + 18, { width: 90, align: "right" });

      doc.fontSize(11).fillColor("#111827")
        .text("Grand Total:", 340, calculationsY + 38, { font: "Helvetica-Bold", width: 110, align: "right" })
        .text(`Rs. ${invoice.totalAmount.toFixed(2)}`, 460, calculationsY + 38, { width: 90, align: "right" });

      // Payment Status (Left side)
      doc.fontSize(10).fillColor("#111827").text("Payment Status:", 50, calculationsY);
      const statusColor = invoice.status === "PAID" ? "#10B981" : invoice.status === "CANCELLED" ? "#EF4444" : "#F59E0B";
      doc.fontSize(12).fillColor(statusColor).text(invoice.status, 50, calculationsY + 18, { font: "Helvetica-Bold" });

      // Footer
      doc.fontSize(8).fillColor("#9CA3AF").text("This is an electronically generated document. No signature is required.", 50, 520, { align: "center" });

      doc.end();

      stream.on("finish", () => {
        resolve(`/uploads/invoices/${filename}`);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoicePDF };
