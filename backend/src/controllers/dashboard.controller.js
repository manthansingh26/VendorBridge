const prisma = require("../config/db");
const ApiResponse = require("../utils/ApiResponse");

// GET /api/dashboard/stats — Admin only
const getDashboardStats = async (req, res, next) => {
  try {
    // Total users count
    const totalUsers = await prisma.user.count();

    // Users by role
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersThisWeek = await prisma.user.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });

    // Today's new users
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newUsersToday = await prisma.user.count({
      where: { createdAt: { gte: today } },
    });

    // Recent 10 users
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Users registered per day (last 7 days)
    const dailyRegistrations = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await prisma.user.count({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
        },
      });

      dailyRegistrations.push({
        date: dayStart.toISOString().split("T")[0],
        day: dayStart.toLocaleDateString("en-IN", { weekday: "short" }),
        count,
      });
    }

    // Format roles data
    const rolesData = {
      ADMIN: 0,
      PROCUREMENT_OFFICER: 0,
      VENDOR: 0,
      MANAGER: 0,
    };
    usersByRole.forEach((r) => {
      rolesData[r.role] = r._count.role;
    });

    res.status(200).json(
      new ApiResponse(200, "Dashboard stats fetched.", {
        totalUsers,
        newUsersToday,
        newUsersThisWeek,
        rolesData,
        dailyRegistrations,
        recentUsers,
      })
    );
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats };
