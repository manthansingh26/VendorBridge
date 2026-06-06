const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { approvalCreateSchema, approvalActionSchema } = require("../validations/approval.validation");
const { logActivity, createNotification } = require("../services/activity.service");

// POST /api/approvals (Request Approval)
const requestApproval = async (req, res, next) => {
  try {
    const validated = approvalCreateSchema.parse(req.body);

    // Verify RFQ and Quotation exist
    const rfq = await prisma.rFQ.findUnique({
      where: { id: validated.rfqId },
    });
    if (!rfq) throw new ApiError(404, "RFQ not found.");

    const quotation = await prisma.quotation.findUnique({
      where: { id: validated.quotationId },
      include: { vendor: true },
    });
    if (!quotation) throw new ApiError(404, "Quotation not found.");
    if (quotation.rfqId !== rfq.id) {
      throw new ApiError(400, "Quotation does not belong to the selected RFQ.");
    }
    if (quotation.status !== "SHORTLISTED") {
      throw new ApiError(400, "Only shortlisted quotations can be sent for approval.");
    }

    // Create approval record
    const approval = await prisma.approval.create({
      data: {
        rfqId: validated.rfqId,
        quotationId: validated.quotationId,
        requestedById: req.user.id,
        status: "PENDING",
        remarks: validated.remarks || null,
      },
    });

    // Update RFQ status to APPROVAL_PENDING
    await prisma.rFQ.update({
      where: { id: validated.rfqId },
      data: { status: "APPROVAL_PENDING" },
    });

    // Log activity
    await logActivity(
      req.user.id,
      "Approval Requested",
      "APPROVAL",
      `Requested approval for quotation from ${quotation.vendor.companyName} on RFQ "${rfq.title}".`
    );

    // Notify all Managers
    const managers = await prisma.user.findMany({
      where: { role: "MANAGER" },
    });

    for (const manager of managers) {
      await createNotification(
        manager.id,
        "Procurement Approval Request",
        `Approval is requested for RFQ "${rfq.title}" by ${req.user.name}.`
      );
    }

    res.status(201).json(new ApiResponse(201, "Approval request submitted successfully.", approval));
  } catch (error) {
    next(error);
  }
};

// GET /api/approvals
const getApprovals = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};

    if (status) {
      where.status = status;
    }

    // Role filtration
    if (req.user.role === "MANAGER") {
      // Managers view all approvals they can act on
    } else if (req.user.role === "PROCUREMENT_OFFICER") {
      // Procurement officers see only what they requested
      where.requestedById = req.user.id;
    }

    const approvals = await prisma.approval.findMany({
      where,
      include: {
        rfq: true,
        quotation: {
          include: { vendor: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(new ApiResponse(200, "Approvals retrieved successfully.", approvals));
  } catch (error) {
    next(error);
  }
};

// GET /api/approvals/:id
const getApprovalById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: {
        rfq: true,
        quotation: {
          include: { vendor: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!approval) {
      throw new ApiError(404, "Approval request not found.");
    }

    res.status(200).json(new ApiResponse(200, "Approval request retrieved.", approval));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/approvals/:id/approve
const approveRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = approvalActionSchema.parse(req.body);

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { rfq: true, quotation: { include: { vendor: true } } },
    });

    if (!approval) {
      throw new ApiError(404, "Approval request not found.");
    }

    if (approval.status !== "PENDING") {
      throw new ApiError(400, "Approval request has already been processed.");
    }

    // Begin Transaction to maintain integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Approval record
      const updatedApproval = await tx.approval.update({
        where: { id },
        data: {
          status: "APPROVED",
          remarks: validated.remarks,
          approverId: req.user.id,
        },
      });

      // 2. Update selected Quotation status to APPROVED
      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: { status: "APPROVED" },
      });

      // 3. Update all other Quotations for the same RFQ to REJECTED
      await tx.quotation.updateMany({
        where: {
          rfqId: approval.rfqId,
          id: { not: approval.quotationId },
        },
        data: { status: "REJECTED" },
      });

      // 4. Update RFQ status to APPROVED
      await tx.rFQ.update({
        where: { id: approval.rfqId },
        data: { status: "APPROVED" },
      });

      return updatedApproval;
    });

    // Audit Log
    await logActivity(
      req.user.id,
      "Procurement Request Approved",
      "APPROVAL",
      `Approved quotation from ${approval.quotation.vendor.companyName} for RFQ "${approval.rfq.title}". Remarks: ${validated.remarks}`
    );

    // Notify Procurement Officer
    await createNotification(
      approval.requestedById,
      "Procurement Approved",
      `Your approval request for RFQ: "${approval.rfq.title}" has been APPROVED by ${req.user.name}.`
    );

    // Notify Vendor
    const vendorUser = await prisma.user.findUnique({
      where: { email: approval.quotation.vendor.email },
    });
    if (vendorUser) {
      await createNotification(
        vendorUser.id,
        "Quotation Approved",
        `Congratulations! Your quotation for RFQ: "${approval.rfq.title}" has been APPROVED. Purchase Order will follow.`
      );
    }

    res.status(200).json(new ApiResponse(200, "Approval request approved successfully.", result));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/approvals/:id/reject
const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = approvalActionSchema.parse(req.body);

    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { rfq: true, quotation: { include: { vendor: true } } },
    });

    if (!approval) {
      throw new ApiError(404, "Approval request not found.");
    }

    if (approval.status !== "PENDING") {
      throw new ApiError(400, "Approval request has already been processed.");
    }

    // Begin Transaction to maintain integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Approval record
      const updatedApproval = await tx.approval.update({
        where: { id },
        data: {
          status: "REJECTED",
          remarks: validated.remarks,
          approverId: req.user.id,
        },
      });

      // 2. Update selected Quotation status to REJECTED
      await tx.quotation.update({
        where: { id: approval.quotationId },
        data: { status: "REJECTED" },
      });

      // 3. Update RFQ status to REJECTED
      await tx.rFQ.update({
        where: { id: approval.rfqId },
        data: { status: "REJECTED" },
      });

      return updatedApproval;
    });

    // Audit Log
    await logActivity(
      req.user.id,
      "Procurement Request Rejected",
      "APPROVAL",
      `Rejected quotation from ${approval.quotation.vendor.companyName} for RFQ "${approval.rfq.title}". Remarks: ${validated.remarks}`
    );

    // Notify Procurement Officer
    await createNotification(
      approval.requestedById,
      "Procurement Rejected",
      `Your approval request for RFQ: "${approval.rfq.title}" was REJECTED by ${req.user.name}. Remarks: ${validated.remarks}`
    );

    // Notify Vendor
    const vendorUser = await prisma.user.findUnique({
      where: { email: approval.quotation.vendor.email },
    });
    if (vendorUser) {
      await createNotification(
        vendorUser.id,
        "Quotation Rejected",
        `Your quotation for RFQ: "${approval.rfq.title}" has been rejected during manager review.`
      );
    }

    res.status(200).json(new ApiResponse(200, "Approval request rejected successfully.", result));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestApproval,
  getApprovals,
  getApprovalById,
  approveRequest,
  rejectRequest,
};
