const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const generatePONumber = require("../utils/generatePONumber");
const calculateTax = require("../utils/calculateTax");
const { logActivity, createNotification } = require("../services/activity.service");

// POST /api/purchase-orders (Generate PO from approved quotation)
const generatePurchaseOrder = async (req, res, next) => {
  try {
    const { rfqId, quotationId } = req.body;

    if (!rfqId || !quotationId) {
      throw new ApiError(400, "RFQ ID and Quotation ID are required.");
    }

    // 1. Check if PO already exists
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: { rfqId, quotationId },
    });

    if (existingPO) {
      throw new ApiError(409, `A Purchase Order already exists for this quotation (PO Ref: ${existingPO.poNumber}).`);
    }

    // 2. Fetch RFQ and Quotation to verify approval
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
    });
    if (!rfq) throw new ApiError(404, "RFQ not found.");
    if (rfq.status !== "APPROVED") {
      throw new ApiError(400, `Cannot generate PO. RFQ status must be APPROVED (Current: ${rfq.status}).`);
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { vendor: true },
    });
    if (!quotation) throw new ApiError(404, "Quotation not found.");
    if (quotation.rfqId !== rfqId) {
      throw new ApiError(400, "Quotation does not belong to the selected RFQ.");
    }
    if (quotation.status !== "APPROVED") {
      throw new ApiError(400, `Cannot generate PO. Quotation status must be APPROVED (Current: ${quotation.status}).`);
    }

    // 3. Perform Calculations
    const unitPrice = quotation.price;
    const quantity = rfq.quantity;
    const taxPercentage = quotation.taxPercentage;
    const { amount, taxAmount, totalAmount } = calculateTax(quantity, unitPrice, taxPercentage);

    // 4. Generate unique PO Number
    const poNumber = generatePONumber();

    // 5. Create Purchase Order and Close RFQ in a transaction
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber,
          rfqId,
          quotationId,
          vendorId: quotation.vendorId,
          generatedById: req.user.id,
          itemName: rfq.itemName,
          quantity,
          unitPrice,
          taxAmount,
          totalAmount,
          status: "GENERATED",
        },
      });

      // Update RFQ status to CLOSED
      await tx.rFQ.update({
        where: { id: rfqId },
        data: { status: "CLOSED" },
      });

      return po;
    });

    // Audit logs
    await logActivity(
      req.user.id,
      "Purchase Order Generated",
      "PURCHASE_ORDER",
      `Generated Purchase Order ${poNumber} for vendor ${quotation.vendor.companyName}.`
    );

    // Notify Vendor
    const vendorUser = await prisma.user.findUnique({
      where: { email: quotation.vendor.email },
    });
    if (vendorUser) {
      await createNotification(
        vendorUser.id,
        "Purchase Order Received",
        `You have received a new Purchase Order: ${poNumber} for "${rfq.itemName}". Please review and accept.`
      );
    }

    res.status(201).json(new ApiResponse(201, "Purchase Order generated successfully.", purchaseOrder));
  } catch (error) {
    next(error);
  }
};

// GET /api/purchase-orders
const getPurchaseOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    // Role visibility filtration
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (!vendorProfile) {
        return res.status(200).json(new ApiResponse(200, "No purchase orders found.", []));
      }
      where.vendorId = vendorProfile.id;
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        rfq: true,
        quotation: true,
        vendor: true,
        generatedBy: {
          select: { id: true, name: true, email: true },
        },
        invoices: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(new ApiResponse(200, "Purchase Orders retrieved successfully.", pos));
  } catch (error) {
    next(error);
  }
};

// GET /api/purchase-orders/:id
const getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        rfq: true,
        quotation: true,
        vendor: true,
        generatedBy: {
          select: { id: true, name: true, email: true },
        },
        invoices: true,
      },
    });

    if (!po) {
      throw new ApiError(404, "Purchase Order not found.");
    }

    // Role security check
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (po.vendorId !== (vendorProfile?.id || "")) {
        throw new ApiError(403, "Access denied.");
      }
    }

    res.status(200).json(new ApiResponse(200, "Purchase Order details retrieved.", po));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/purchase-orders/:id/status
const updatePOStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["GENERATED", "SENT", "ACCEPTED", "COMPLETED", "CANCELLED"];
    if (!status || !validStatuses.includes(status)) {
      throw new ApiError(400, "Invalid status provided.");
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, generatedBy: true },
    });

    if (!po) {
      throw new ApiError(404, "Purchase Order not found.");
    }

    // Access control: VENDOR can only change to ACCEPTED or CANCELLED, officers/admins manage the rest.
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      if (po.vendorId !== (vendorProfile?.id || "")) {
        throw new ApiError(403, "Access denied. You cannot manage this Purchase Order.");
      }
      if (status !== "ACCEPTED" && status !== "CANCELLED") {
        throw new ApiError(400, "Vendors are only allowed to ACCEPT or CANCEL purchase orders.");
      }
    } else if (!["ADMIN", "PROCUREMENT_OFFICER"].includes(req.user.role)) {
      throw new ApiError(403, "You do not have permission to update purchase order status.");
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
    });

    // Audit logs
    await logActivity(
      req.user.id,
      "Purchase Order Status Updated",
      "PURCHASE_ORDER",
      `Purchase Order ${po.poNumber} status updated to ${status}.`
    );

    // Notify creator/procurement officer
    await createNotification(
      po.generatedById,
      "Purchase Order Update",
      `Purchase Order ${po.poNumber} status has been updated to ${status} by ${req.user.name}.`
    );

    res.status(200).json(new ApiResponse(200, "Purchase Order status updated successfully.", updatedPO));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generatePurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  updatePOStatus,
};
