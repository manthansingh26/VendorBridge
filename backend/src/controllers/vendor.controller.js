const prisma = require("../config/db");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { vendorCreateSchema, vendorUpdateSchema } = require("../validations/vendor.validation");
const { logActivity } = require("../services/activity.service");

// POST /api/vendors
const createVendor = async (req, res, next) => {
  try {
    const validated = vendorCreateSchema.parse(req.body);

    const existingEmail = await prisma.vendor.findUnique({
      where: { email: validated.email },
    });

    if (existingEmail) {
      throw new ApiError(409, "Vendor with this email already exists.");
    }

    const vendor = await prisma.vendor.create({
      data: validated,
    });

    // Audit log
    await logActivity(
      req.user.id,
      "Vendor Profile Created",
      "VENDOR",
      `Vendor ${vendor.companyName} (${vendor.category}) was added by ${req.user.name}.`
    );

    res.status(201).json(new ApiResponse(201, "Vendor added successfully.", vendor));
  } catch (error) {
    next(error);
  }
};

// GET /api/vendors
const getVendors = async (req, res, next) => {
  try {
    const { category, status, search } = req.query;

    const where = {};

    if (category) {
      where.category = category;
    }

    if (status) {
      if (status === "BLOCKED") {
        where.status = { in: ["INACTIVE", "BLACKLISTED"] };
      } else {
        where.status = status;
      }
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const vendors = await prisma.vendor.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(new ApiResponse(200, "Vendors retrieved successfully.", vendors));
  } catch (error) {
    next(error);
  }
};

// GET /api/vendors/:id
const getVendorById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        rfqAssignments: {
          include: { rfq: true },
        },
        quotations: {
          include: { rfq: true },
        },
        purchaseOrders: true,
      },
    });

    if (!vendor) {
      throw new ApiError(404, "Vendor not found.");
    }

    res.status(200).json(new ApiResponse(200, "Vendor details retrieved.", vendor));
  } catch (error) {
    next(error);
  }
};

// PATCH /api/vendors/:id
const updateVendor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const validated = vendorUpdateSchema.parse(req.body);

    const vendorExists = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendorExists) {
      throw new ApiError(404, "Vendor not found.");
    }

    if (validated.email && validated.email !== vendorExists.email) {
      const emailTaken = await prisma.vendor.findUnique({
        where: { email: validated.email },
      });
      if (emailTaken) {
        throw new ApiError(409, "Email is already in use by another vendor.");
      }
    }

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: validated,
    });

    // Audit log
    await logActivity(
      req.user.id,
      "Vendor Profile Updated",
      "VENDOR",
      `Vendor ${updatedVendor.companyName} profile was updated.`
    );

    res.status(200).json(new ApiResponse(200, "Vendor updated successfully.", updatedVendor));
  } catch (error) {
    next(error);
  }
};

// DELETE /api/vendors/:id
const deleteVendor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      throw new ApiError(404, "Vendor not found.");
    }

    await prisma.vendor.delete({
      where: { id },
    });

    // Audit log
    await logActivity(
      req.user.id,
      "Vendor Profile Deleted",
      "VENDOR",
      `Vendor ${vendor.companyName} was deleted from database.`
    );

    res.status(200).json(new ApiResponse(200, "Vendor deleted successfully."));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createVendor,
  getVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
};
