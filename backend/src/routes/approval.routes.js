const express = require("express");
const {
  requestApproval,
  getApprovals,
  getApprovalById,
  approveRequest,
  rejectRequest,
} = require("../controllers/approval.controller");
const authMiddleware = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getApprovals);
router.get("/:id", getApprovalById);

router.post("/", authorize("ADMIN", "PROCUREMENT_OFFICER"), requestApproval);

// Action routes locked to MANAGER role (ADMIN also allowed as fail-safe)
router.patch("/:id/approve", authorize("ADMIN", "MANAGER"), approveRequest);
router.patch("/:id/reject", authorize("ADMIN", "MANAGER"), rejectRequest);

module.exports = router;
