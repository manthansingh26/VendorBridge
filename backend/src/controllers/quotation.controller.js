const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const calculateTax = require("../utils/calculateTax");
const { quotationCreateSchema, quotationUpdateSchema } = require("../validations/quotation.validation");
const { logActivity, createNotification } = require("../services/activity.service");

// POST /api/quotations
const submitQuotation = async (req, res, next) => {
  try {
    const validated = quotationCreateSchema.parse(req.body);

    // 1. Resolve vendor profile from user session
    const vendorProfile = await prisma.vendor.findUnique({
      where: { email: req.user.email },
    });

    if (!vendorProfile || req.user.role !== "VENDOR") {
      throw new ApiError(403, "Only registered vendors can submit quotations.");
    }

    // 2. Resolve RFQ and check deadlines/assignment
    const rfq = await prisma.rFQ.findUnique({
      where: { id: validated.rfqId },
      include: { assignedVendors: true },
    });

    if (!rfq) {
      throw new ApiError(404, "RFQ not found.");
    }

    const isAssigned = rfq.assignedVendors.some((av) => av.vendorId === vendorProfile.id);
    if (!isAssigned) {
      throw new ApiError(403, "You are not authorized to submit a quotation for this RFQ.");
    }

    if (new Date() > new Date(rfq.deadline)) {
      throw new ApiError(400, "RFQ deadline has already passed.");
    }

    // Check if quotation already exists for this vendor and RFQ
    const existingQuotation = await prisma.quotation.findFirst({
      where: {
        rfqId: validated.rfqId,
        vendorId: vendorProfile.id,
      },
    });

    if (existingQuotation) {
      throw new ApiError(409, "You have already submitted a quotation for this RFQ. Please edit the existing one.");
    }

    // 3. Perform calculations
    const { amount, taxAmount, totalAmount } = calculateTax(
      rfq.quantity,
      validated.price,
      validated.taxPercentage
    );

    // 4. Create Quotation
    const quotation = await prisma.quotation.create({
      data: {
        rfqId: validated.rfqId,
        vendorId: vendorProfile.id,
        price: validated.price, // Unit price
        taxPercentage: validated.taxPercentage,
        totalAmount: totalAmount, // Total price including tax
        deliveryTimeline: validated.deliveryTimeline,
        notes: validated.notes || null,
        attachmentUrl: validated.attachmentUrl || null,
        status: "SUBMITTED",
        paymentTerms: validated.paymentTerms || null,
      },
    });

    // Update RFQ status to QUOTATION_RECEIVED if it was SENT
    if (rfq.status === "SENT") {
      await prisma.rFQ.update({
        where: { id: rfq.id },
        data: { status: "QUOTATION_RECEIVED" },
      });
    }

    // Activity log and Notifications
    await logActivity(
      req.user.id,
      "Quotation Submitted",
      "QUOTATION",
      `Vendor ${vendorProfile.companyName} submitted a quotation of Rs. ${totalAmount} for RFQ "${rfq.title}".`
    );

    // Notify the creator of the RFQ
    await createNotification(
      rfq.createdById,
      "Quotation Received",
      `Vendor ${vendorProfile.companyName} has submitted a quotation for RFQ: "${rfq.title}".`
    );

    res.status(201).json(new ApiResponse(201, "Quotation submitted successfully.", quotation));
  } catch (error) {
    next(error);
  }
};

// GET /api/quotations
const getQuotations = async (req, res, next) => {
  try {
    const where = {};

    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (!vendorProfile) {
        return res.status(200).json(new ApiResponse(200, "No quotations found.", []));
      }
      where.vendorId = vendorProfile.id;
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        rfq: true,
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(new ApiResponse(200, "Quotations retrieved successfully.", quotations));
  } catch (error) {
    next(error);
  }
};

// GET /api/quotations/:id
const getQuotationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        rfq: true,
        vendor: true,
      },
    });

    if (!quotation) {
      throw new ApiError(404, "Quotation not found.");
    }

    // Access control
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (quotation.vendorId !== (vendorProfile?.id || "")) {
        throw new ApiError(403, "Access denied.");
      }
    }

    res.status(200).json(new ApiResponse(200, "Quotation retrieved.", quotation));
  } catch (error) {
    next(error);
  }
};

// GET /api/quotations/rfq/:rfqId
const getQuotationsByRFQ = async (req, res, next) => {
  try {
    const { rfqId } = req.params;

    const query = {
      where: { rfqId },
      include: { vendor: true },
    };

    const quotations = await prisma.quotation.findMany(query);
    res.status(200).json(new ApiResponse(200, "Quotations for RFQ retrieved.", quotations));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/quotations/:id
const updateQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = quotationUpdateSchema.parse(req.body);

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { rfq: true },
    });

    if (!quotation) {
      throw new ApiError(404, "Quotation not found.");
    }

    // Ensure user is the owning vendor
    const vendorProfile = await prisma.vendor.findUnique({
      where: { email: req.user.email },
    });

    if (!vendorProfile || quotation.vendorId !== vendorProfile.id) {
      throw new ApiError(403, "You can only edit your own quotations.");
    }

    // Check deadlines and status
    if (new Date() > new Date(quotation.rfq.deadline)) {
      throw new ApiError(400, "Cannot edit quotation after RFQ deadline has passed.");
    }

    if (quotation.status !== "SUBMITTED") {
      throw new ApiError(400, `Cannot edit quotation with status: ${quotation.status}.`);
    }

    // Calculations
    const finalPrice = validated.price !== undefined ? validated.price : quotation.price;
    const finalTax = validated.taxPercentage !== undefined ? validated.taxPercentage : quotation.taxPercentage;
    const { totalAmount } = calculateTax(quotation.rfq.quantity, finalPrice, finalTax);

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        price: finalPrice,
        taxPercentage: finalTax,
        totalAmount: totalAmount,
        deliveryTimeline: validated.deliveryTimeline !== undefined ? validated.deliveryTimeline : quotation.deliveryTimeline,
        notes: validated.notes !== undefined ? validated.notes : quotation.notes,
        attachmentUrl: validated.attachmentUrl !== undefined ? validated.attachmentUrl : quotation.attachmentUrl,
        paymentTerms: validated.paymentTerms !== undefined ? validated.paymentTerms : quotation.paymentTerms,
      },
    });

    res.status(200).json(new ApiResponse(200, "Quotation updated successfully.", updated));
  } catch (error) {
    next(error);
  }
};

// POST /api/quotations/:id/shortlist
const shortlistQuotation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: { rfq: true, vendor: true },
    });

    if (!quotation) {
      throw new ApiError(404, "Quotation not found.");
    }

    const updatedQuotation = await prisma.quotation.update({
      where: { id },
      data: { status: "SHORTLISTED" },
    });

    // Update RFQ status to UNDER_COMPARISON
    await prisma.rFQ.update({
      where: { id: quotation.rfqId },
      data: { status: "UNDER_COMPARISON" },
    });

    await logActivity(
      req.user.id,
      "Quotation Shortlisted",
      "QUOTATION",
      `Quotation from ${quotation.vendor.companyName} for RFQ "${quotation.rfq.title}" was shortlisted.`
    );

    // Notify the vendor
    const vendorUser = await prisma.user.findUnique({
      where: { email: quotation.vendor.email },
    });
    if (vendorUser) {
      await createNotification(
        vendorUser.id,
        "Quotation Shortlisted",
        `Your quotation for RFQ: "${quotation.rfq.title}" has been shortlisted for comparison.`
      );
    }

    res.status(200).json(new ApiResponse(200, "Quotation shortlisted successfully.", updatedQuotation));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitQuotation,
  getQuotations,
  getQuotationById,
  getQuotationsByRFQ,
  updateQuotation,
  shortlistQuotation,
};
