const prisma = require("../config/db");
const ApiResponse = require("../utils/ApiResponse");

// GET /api/activity-logs
const getActivityLogs = async (req, res, next) => {
  try {
    const { module } = req.query;
    const where = {};
    if (module && module !== "ALL") {
      where.module = module;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, role: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.status(200).json(new ApiResponse(200, "Activity logs retrieved.", logs));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLogs,
};
