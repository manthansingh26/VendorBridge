const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { rfqCreateSchema, rfqUpdateSchema } = require("../validations/rfq.validation");
const { logActivity, createNotification } = require("../services/activity.service");

// POST /api/rfqs
const createRFQ = async (req, res, next) => {
  try {
    const validated = rfqCreateSchema.parse(req.body);

    const rfq = await prisma.rFQ.create({
      data: {
        title: validated.title,
        description: validated.description,
        itemName: validated.itemName,
        quantity: validated.quantity,
        unit: validated.unit,
        category: validated.category,
        attachmentUrl: validated.attachmentUrl || null,
        deadline: new Date(validated.deadline),
        status: "DRAFT",
        createdById: req.user.id,
      },
    });

    await logActivity(
      req.user.id,
      "RFQ Created",
      "RFQ",
      `RFQ "${rfq.title}" created as DRAFT by ${req.user.name}.`
    );

    res.status(201).json(new ApiResponse(201, "RFQ created as draft.", rfq));
  } catch (error) {
    next(error);
  }
};

// GET /api/rfqs
const getRFQs = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { itemName: { contains: search, mode: "insensitive" } },
      ];
    }

    // Role-based visibility logic
    if (req.user.role === "VENDOR") {
      // Find the corresponding Vendor profile
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });

      if (!vendorProfile) {
        return res.status(200).json(new ApiResponse(200, "No RFQs found.", []));
      }

      // Filter RFQs assigned to this vendor
      where.assignedVendors = {
        some: { vendorId: vendorProfile.id },
      };

      if (status) {
        if (status === "DRAFT") {
          where.status = "NONE"; // Prevent vendors from seeing drafts
        } else {
          where.status = status;
        }
      } else {
        where.status = { not: "DRAFT" };
      }
    }

    const rfqs = await prisma.rFQ.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedVendors: {
          include: { vendor: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(new ApiResponse(200, "RFQs retrieved successfully.", rfqs));
  } catch (error) {
    next(error);
  }
};

// GET /api/rfqs/:id
const getRFQById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedVendors: {
          include: { vendor: true },
        },
        quotations: {
          include: { vendor: true },
        },
        approvals: {
          include: { requestedBy: true, approver: true },
        },
        purchaseOrders: true,
      },
    });

    if (!rfq) {
      throw new ApiError(404, "RFQ not found.");
    }

    // If VENDOR, check if assigned
    if (req.user.role === "VENDOR") {
      const vendorProfile = await prisma.vendor.findUnique({
        where: { email: req.user.email },
      });
      const isAssigned = rfq.assignedVendors.some(
        (av) => av.vendorId === (vendorProfile?.id || "")
      );
      if (!isAssigned) {
        throw new ApiError(403, "Access denied. You are not assigned to this RFQ.");
      }
    }

    res.status(200).json(new ApiResponse(200, "RFQ details retrieved.", rfq));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/rfqs/:id
const updateRFQ = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = rfqUpdateSchema.parse(req.body);

    const rfqExists = await prisma.rFQ.findUnique({
      where: { id },
    });

    if (!rfqExists) {
      throw new ApiError(404, "RFQ not found.");
    }

    if (rfqExists.status !== "DRAFT" && req.user.role !== "ADMIN") {
      throw new ApiError(400, "Cannot edit an RFQ that has already been sent/processed.");
    }

    const updatedData = { ...validated };
    if (validated.deadline) {
      updatedData.deadline = new Date(validated.deadline);
    }

    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: updatedData,
    });

    await logActivity(
      req.user.id,
      "RFQ Updated",
      "RFQ",
      `RFQ "${updatedRFQ.title}" was updated.`
    );

    res.status(200).json(new ApiResponse(200, "RFQ updated successfully.", updatedRFQ));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/rfqs/:id
const deleteRFQ = async (req, res, next) => {
  try {
    const { id } = req.params;

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
    });

    if (!rfq) {
      throw new ApiError(404, "RFQ not found.");
    }

    await prisma.rFQ.delete({
      where: { id },
    });

    await logActivity(
      req.user.id,
      "RFQ Deleted",
      "RFQ",
      `RFQ "${rfq.title}" was deleted.`
    );

    res.status(200).json(new ApiResponse(200, "RFQ deleted successfully."));
  } catch (error) {
    next(error);
  }
};

// POST /api/rfqs/:id/assign-vendors
const assignVendors = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vendorIds } = req.body; // Array of vendor ids

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      throw new ApiError(400, "Please provide a non-empty array of vendor IDs.");
    }

    const rfq = await prisma.rFQ.findUnique({
      where: { id },
    });

    if (!rfq) {
      throw new ApiError(404, "RFQ not found.");
    }

    // Delete previous assignments if any, then batch create
    await prisma.rFQVendor.deleteMany({
      where: { rfqId: id },
    });

    const assignments = vendorIds.map((vId) => ({
      rfqId: id,
      vendorId: vId,
    }));

    await prisma.rFQVendor.createMany({
      data: assignments,
    });

    // Update status to SENT
    const updatedRFQ = await prisma.rFQ.update({
      where: { id },
      data: { status: "SENT" },
    });

    await logActivity(
      req.user.id,
      "RFQ Assigned to Vendors",
      "RFQ",
      `RFQ "${rfq.title}" was assigned to ${vendorIds.length} vendors.`
    );

    // Notify each vendor who has a matching user account
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    for (const vendor of vendors) {
      const targetUser = await prisma.user.findUnique({
        where: { email: vendor.email },
      });

      if (targetUser) {
        await createNotification(
          targetUser.id,
          "New RFQ Assigned",
          `You have been invited to submit a quotation for RFQ: "${rfq.title}". Deadline: ${new Date(rfq.deadline).toLocaleDateString()}.`
        );
      }
    }

    res.status(200).json(
      new ApiResponse(200, "Vendors assigned and RFQ status updated to SENT.", updatedRFQ)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRFQ,
  getRFQs,
  getRFQById,
  updateRFQ,
  deleteRFQ,
  assignVendors,
};
