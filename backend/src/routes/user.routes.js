const express = require("express");
const { getAllUsers, getUserById, updateUserRole, updateProfile, uploadAvatar, deleteProfile } = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const authorize = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

const router = express.Router();

// Profile updates — any authenticated user
router.patch("/profile", authMiddleware, updateProfile);
router.post("/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
router.post("/upload", authMiddleware, upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a file" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ success: true, fileUrl });
  } catch (error) {
    next(error);
  }
});
router.delete("/profile", authMiddleware, deleteProfile);

// Admin only routes below
router.use(authMiddleware, authorize("ADMIN"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.patch("/:id/role", updateUserRole);

module.exports = router;
