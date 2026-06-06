const path = require("path");
const fs = require("fs");
const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const generateInvoiceNumber = require("../utils/generateInvoiceNumber");
const { invoiceCreateSchema } = require("../validations/invoice.validation");
const { generateInvoicePDF } = require("../services/pdf.service");
const { sendInvoiceEmail } = require("../services/email.service");
const { logActivity, createNotification } = require("../services/activity.service");

// POST /api/invoices (Generate Invoice from PO)
const generateInvoice = async (req, res, next) => {
  try {
    const validated = invoiceCreateSchema.parse(req.body);

    // 1. Check if invoice already exists for this PO
    const existingInvoice = await prisma.invoice.findFirst({
      where: { poId: validated.poId },
    });

    if (existingInvoice) {
      throw new ApiError(409, `An invoice has already been generated for this Purchase Order (Invoice Ref: ${existingInvoice.invoiceNumber}).`);
    }

    // 2. Fetch PO with related items
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: validated.poId },
      include: { vendor: true, quotation: true },
    });

    if (!po) {
      throw new ApiError(404, "Purchase Order not found.");
    }
    if (po.status !== "ACCEPTED") {
      throw new ApiError(400, `Cannot generate invoice. Purchase Order status must be ACCEPTED (Current: ${po.status}).`);
    }

    // 3. Generate unique invoice number
    const invoiceNumber = generateInvoiceNumber();

    // 4. Create Invoice in Database
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        poId: validated.poId,
        vendorId: po.vendorId,
        amount: po.unitPrice * po.quantity,
        taxAmount: po.taxAmount,
        totalAmount: po.totalAmount,
        dueDate: new Date(validated.dueDate),
        status: "GENERATED",
      },
    });

    // 5. Generate Invoice PDF on disk
    let pdfUrl = null;
    try {
      pdfUrl = await generateInvoicePDF(invoice, po, po.vendor);
      // Update PDF URL in DB
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { pdfUrl },
      });
      invoice.pdfUrl = pdfUrl;
    } catch (pdfErr) {
      console.error("PDF generation failed during invoice creation:", pdfErr);
    }

    // Update PO status to COMPLETED if not already
    if (po.status !== "COMPLETED") {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: "COMPLETED" },
      });
    }

    // Audit log
    await logActivity(
      req.user.id,
      "Invoice Generated",
      "INVOICE",
      `Invoice ${invoiceNumber} generated from Purchase Order ${po.poNumber}.`
    );

    // Notify Vendor
    const vendorUser = await prisma.user.findUnique({
      where: { email: po.vendor.email },
    });
    if (vendorUser) {
      await createNotification(
        vendorUser.id,
        "Invoice Generated",
        `Invoice ${invoiceNumber} has been generated for your Purchase Order ${po.poNumber}. Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`
      );
    }

    res.status(201).json(new ApiResponse(201, "Invoice generated successfully.", invoice));
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices
const getInvoices = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    // Role filtration
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (!vendorProfile) {
        return res.status(200).json(new ApiResponse(200, "No invoices found.", []));
      }
      where.vendorId = vendorProfile.id;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        purchaseOrder: true,
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(new ApiResponse(200, "Invoices retrieved successfully.", invoices));
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/:id
const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
        vendor: true,
      },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found.");
    }

    // Role verification
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (invoice.vendorId !== (vendorProfile?.id || "")) {
        throw new ApiError(403, "Access denied.");
      }
    }

    res.status(200).json(new ApiResponse(200, "Invoice details retrieved.", invoice));
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/:id/pdf (Download PDF file)
const getInvoicePDFFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found.");
    }

    let absolutePath = invoice.pdfUrl ? path.join(__dirname, "../..", invoice.pdfUrl) : null;

    if (!absolutePath || !fs.existsSync(absolutePath)) {
      // PDF does not exist or has not been generated yet (e.g. seeded data). Generate it on-the-fly.
      try {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: invoice.poId },
          include: { vendor: true, quotation: true },
        });
        const generatedPdfUrl = await generateInvoicePDF(invoice, po, po.vendor);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl: generatedPdfUrl },
        });
        invoice.pdfUrl = generatedPdfUrl;
        absolutePath = path.join(__dirname, "../..", generatedPdfUrl);
      } catch (pdfErr) {
        console.error("On-demand PDF generation failed:", pdfErr);
        throw new ApiError(500, "Failed to generate Invoice PDF on demand.");
      }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
};

// POST /api/invoices/:id/send-email (Email Invoice PDF)
const emailInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { vendor: true, purchaseOrder: true },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found.");
    }

    let absolutePath = invoice.pdfUrl ? path.join(__dirname, "../..", invoice.pdfUrl) : null;
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      try {
        const po = await prisma.purchaseOrder.findUnique({
          where: { id: invoice.poId },
          include: { vendor: true, quotation: true },
        });
        const generatedPdfUrl = await generateInvoicePDF(invoice, po, po.vendor);
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { pdfUrl: generatedPdfUrl },
        });
        invoice.pdfUrl = generatedPdfUrl;
      } catch (pdfErr) {
        console.error("On-demand PDF generation failed for email:", pdfErr);
        throw new ApiError(500, "Failed to generate Invoice PDF on demand for emailing.");
      }
    }

    const toEmail = invoice.vendor.email;
    const subject = `Invoice ${invoice.invoiceNumber} from VendorBridge ERP`;
    const message = `Dear Partner,\n\nPlease find attached the generated Invoice ${invoice.invoiceNumber} in response to Purchase Order ${invoice.purchaseOrder.poNumber}.\n\nTotal Due: Rs. ${invoice.totalAmount}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nThank you,\nProcurement Department\nVendorBridge ERP`;

    const emailSent = await sendInvoiceEmail(toEmail, subject, message, invoice.pdfUrl);

    if (!emailSent) {
      throw new ApiError(500, "Failed to send invoice email.");
    }

    // Update invoice status to SENT if it was GENERATED
    let updatedInvoice = invoice;
    if (invoice.status === "GENERATED") {
      updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: { status: "SENT" },
      });
    }

    // Log Activity
    await logActivity(
      req.user.id,
      "Invoice Emailed",
      "INVOICE",
      `Invoice ${invoice.invoiceNumber} emailed to vendor ${invoice.vendor.companyName} (${toEmail}).`
    );

    res.status(200).json(new ApiResponse(200, "Invoice email sent successfully.", updatedInvoice));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/invoices/:id/status (Mark invoice status, e.g. PAID)
const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["GENERATED", "SENT", "PAID", "OVERDUE", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status provided.");
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { vendor: true },
    });

    if (!invoice) {
      throw new ApiError(404, "Invoice not found.");
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    // Log Activity
    await logActivity(
      req.user.id,
      "Invoice Status Updated",
      "INVOICE",
      `Invoice ${invoice.invoiceNumber} status updated to ${status}.`
    );

    // Notify Vendor
    const vendorUser = await prisma.user.findUnique({
      where: { email: invoice.vendor.email },
    });
    if (vendorUser) {
      await createNotification(
        vendorUser.id,
        "Invoice Payment Updated",
        `Your invoice ${invoice.invoiceNumber} has been marked as ${status}.`
      );
    }

    res.status(200).json(new ApiResponse(200, "Invoice status updated successfully.", updatedInvoice));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateInvoice,
  getInvoices,
  getInvoiceById,
  getInvoicePDFFile,
  emailInvoice,
  updateInvoiceStatus,
};
