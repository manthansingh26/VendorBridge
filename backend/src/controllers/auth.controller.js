const bcrypt = require("bcryptjs");
const prisma = require("../config/db");
const generateToken = require("../utils/generateToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const { registerSchema, loginSchema } = require("../validations/auth.validation");

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new ApiError(409, "User with this email already exists.");
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username: validated.username },
    });

    if (existingUsername) {
      throw new ApiError(409, "Username is already taken.");
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(validated.password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        username: validated.username,
        phone: validated.phone || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT
    const token = generateToken(user.id, user.role);

    res.status(201).json(
      new ApiResponse(201, "User registered successfully.", { user, token })
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // Compare password
    const isMatch = await bcrypt.compare(validated.password, user.password);

    if (!isMatch) {
      throw new ApiError(401, "Invalid email or password.");
    }

    // Generate JWT
    const token = generateToken(user.id, user.role);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    res.status(200).json(
      new ApiResponse(200, "Login successful.", {
        user: userWithoutPassword,
        token,
      })
    );
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    res.status(200).json(
      new ApiResponse(200, "User profile fetched.", { user: req.user })
    );
  } catch (error) {
    next(error);
  }
};

const jwt = require("jsonwebtoken");
const { sendInvoiceEmail } = require("../services/email.service");
const { forgotPasswordSchema, resetPasswordSchema } = require("../validations/auth.validation");

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const validated = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      return res.status(200).json(
        new ApiResponse(200, "If the email is registered, a password reset link has been sent.")
      );
    }

    const resetToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET || "fallback_secret", {
      expiresIn: "15m",
    });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    const textMessage = `Dear ${user.name},\n\nYou requested a password reset for your VendorBridge ERP account. Please click on the link below or copy and paste it into your browser to reset your password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you did not request this, you can safely ignore this email.`;

    await sendInvoiceEmail(user.email, "Password Reset Request - VendorBridge ERP", textMessage);

    res.status(200).json(
      new ApiResponse(200, "Password reset link sent successfully.", {
        resetToken,
        resetUrl,
      })
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const validated = resetPasswordSchema.parse(req.body);

    let decoded;
    try {
      decoded = jwt.verify(validated.token, process.env.JWT_SECRET || "fallback_secret");
    } catch (err) {
      throw new ApiError(400, "Invalid or expired password reset token.");
    }

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      throw new ApiError(404, "User not found.");
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(validated.password, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json(new ApiResponse(200, "Password reset successfully. You can now login."));
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, forgotPassword, resetPassword };
