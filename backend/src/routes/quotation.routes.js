const express = require("express");
const {
  submitQuotation,
  getQuotations,
  getQuotationById,
  getQuotationsByRFQ,
  updateQuotation,
  shortlistQuotation,
} = require("../controllers/quotation.controller");
const authMiddleware = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", getQuotations);
router.get("/rfq/:rfqId", authorize("ADMIN", "PROCUREMENT_OFFICER", "MANAGER"), getQuotationsByRFQ);
router.get("/:id", getQuotationById);

router.post("/", authorize("VENDOR"), submitQuotation);
router.patch("/:id", authorize("VENDOR"), updateQuotation);

router.post("/:id/shortlist", authorize("ADMIN", "PROCUREMENT_OFFICER"), shortlistQuotation);

module.exports = router;
