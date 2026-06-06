const prisma = require("../config/db");
const ApiResponse = require("../utils/ApiResponse");

// GET /api/reports/summary
const getSummary = async (req, res, next) => {
  try {
    const totalVendors = await prisma.vendor.count();
    const activeVendors = await prisma.vendor.count({ where: { status: "ACTIVE" } });
    const totalRFQs = await prisma.rFQ.count();
    
    const approvedRFQs = await prisma.rFQ.count({
      where: { status: "APPROVED" },
    });

    const rejectedRFQs = await prisma.rFQ.count({
      where: { status: "REJECTED" },
    });

    const totalPOs = await prisma.purchaseOrder.count();
    const completedPOs = await prisma.purchaseOrder.count({ where: { status: "COMPLETED" } });
    const totalInvoices = await prisma.invoice.count();
    const overdueInvoices = await prisma.invoice.count({ where: { status: "OVERDUE" } });
    const pendingApprovals = await prisma.approval.count({
      where: { status: "PENDING" },
    });

    // Calculate total spending (sum of all PO totalAmount)
    const spendingAgg = await prisma.purchaseOrder.aggregate({
      _sum: {
        totalAmount: true,
      },
    });
    const totalSpending = spendingAgg._sum.totalAmount || 0;

    // Fetch top 5 vendors by rating
    const topVendors = await prisma.vendor.findMany({
      take: 5,
      orderBy: { rating: "desc" },
    });

    // Fetch spend by category
    const spendByCategoryRaw = await prisma.purchaseOrder.findMany({
      select: {
        totalAmount: true,
        rfq: {
          select: { category: true }
        }
      }
    });

    const categorySpendMap = {};
    spendByCategoryRaw.forEach((po) => {
      const cat = po.rfq?.category || "Other";
      if (!categorySpendMap[cat]) {
        categorySpendMap[cat] = 0;
      }
      categorySpendMap[cat] += po.totalAmount;
    });

    const spendByCategory = Object.keys(categorySpendMap).map((key) => ({
      category: key,
      amount: categorySpendMap[key],
    }));

    // Fetch spend by vendor
    const spendByVendorRaw = await prisma.purchaseOrder.findMany({
      select: {
        totalAmount: true,
        vendor: {
          select: { companyName: true }
        }
      }
    });

    const vendorSpendMap = {};
    spendByVendorRaw.forEach((po) => {
      const name = po.vendor?.companyName || "Unknown";
      if (!vendorSpendMap[name]) {
        vendorSpendMap[name] = 0;
      }
      vendorSpendMap[name] += po.totalAmount;
    });

    const spendByVendor = Object.keys(vendorSpendMap).map((key) => ({
      vendorName: key,
      amount: vendorSpendMap[key],
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);

    res.status(200).json(
      new ApiResponse(200, "Summary reports fetched successfully.", {
        totalVendors,
        activeVendors,
        totalRFQs,
        approvedRFQs,
        rejectedRFQs,
        totalPOs,
        completedPOs,
        totalInvoices,
        overdueInvoices,
        pendingApprovals,
        totalSpending,
        topVendors,
        spendByCategory,
        spendByVendor
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/vendor-performance
const getVendorPerformance = async (req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        quotations: {
          select: { status: true },
        },
        purchaseOrders: {
          select: { totalAmount: true },
        },
      },
    });

    const performance = vendors.map((v) => {
      const totalSubmitted = v.quotations.length;
      const totalApproved = v.quotations.filter((q) => q.status === "APPROVED").length;
      const successRate = totalSubmitted > 0 ? (totalApproved / totalSubmitted) * 100 : 0;
      
      const totalBusiness = v.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
      const purchaseOrdersCount = v.purchaseOrders.length;

      return {
        id: v.id,
        companyName: v.companyName,
        category: v.category,
        rating: v.rating,
        totalSubmitted,
        totalApproved,
        successRate: parseFloat(successRate.toFixed(1)),
        totalBusiness: parseFloat(totalBusiness.toFixed(2)),
        purchaseOrdersCount,
      };
    });

    res.status(200).json(new ApiResponse(200, "Vendor performance report fetched.", performance));
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/monthly-spending
const getMonthlySpending = async (req, res, next) => {
  try {
    // Retrieve POs grouped by month
    const pos = await prisma.purchaseOrder.findMany({
      select: {
        totalAmount: true,
        createdAt: true,
      },
    });

    const monthlyMap = {};

    pos.forEach((po) => {
      const date = new Date(po.createdAt);
      const monthYear = date.toLocaleString("default", { month: "short", year: "numeric" });
      
      if (!monthlyMap[monthYear]) {
        monthlyMap[monthYear] = 0;
      }
      monthlyMap[monthYear] += po.totalAmount;
    });

    const spending = Object.keys(monthlyMap).map((key) => ({
      month: key,
      spending: parseFloat(monthlyMap[key].toFixed(2)),
    }));

    res.status(200).json(new ApiResponse(200, "Monthly spending report fetched.", spending));
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/procurement-stats
const getProcurementStats = async (req, res, next) => {
  try {
    const rfqStatuses = await prisma.rFQ.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });

    const poStatuses = await prisma.purchaseOrder.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });

    const invoiceStatuses = await prisma.invoice.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    });

    res.status(200).json(
      new ApiResponse(200, "Procurement status statistics fetched.", {
        rfqs: rfqStatuses.map((item) => ({ status: item.status, count: item._count._all })),
        pos: poStatuses.map((item) => ({ status: item.status, count: item._count._all })),
        invoices: invoiceStatuses.map((item) => ({ status: item.status, count: item._count._all })),
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  getVendorPerformance,
  getMonthlySpending,
  getProcurementStats,
};
