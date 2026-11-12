
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const transporter = require("../config/emailService");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

// ================= TOKEN HELPERS =================

const createAccessToken = (customer) => {
  return jwt.sign(
    {
      id: customer._id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      role: "customer",
    },
    process.env.JWT_SECRET
  );
};

const hashAccessToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

// ================= REGISTER CUSTOMER =================

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingCustomer = await Customer.findOne({
      email: normalizedEmail,
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const customer = new Customer({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
      isVerified: true,
      verificationToken: null,
    });

    await customer.save();

    res.status(201).json({
      message: "Registration successful! You can now login.",
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// ================= FORGOT PASSWORD =================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const customer = await Customer.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!customer) {
      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    customer.resetPasswordToken = resetToken;
    customer.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await customer.save();

    const resetLink =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: customer.email,
      subject: "Reset Your Password - DJ Vipul",
      html: `
        <h2>DJ Vipul Professional Sound & Lights</h2>

        <p>Hello ${customer.name},</p>

        <p>We received a request to reset your password.</p>

        <p>Click the button below to create a new password:</p>

        <a href="${resetLink}"
           style="
             display: inline-block;
             padding: 12px 20px;
             background-color: #d4af37;
             color: black;
             text-decoration: none;
             border-radius: 5px;
           ">
          Reset Password
        </a>

        <p>This link will expire in 15 minutes.</p>

        <p>If you did not request a password reset, you can ignore this email.</p>

        <p>Regards,<br>DJ Vipul Team</p>
      `,
    });

    res.status(200).json({
      message: "Password reset link has been sent to your email.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    res.status(500).json({
      message: "Server error while sending password reset email",
    });
  }
});

// ================= RESET PASSWORD =================

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    const customer = await Customer.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!customer) {
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    customer.password = hashedPassword;
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;

    // Revoke existing customer login
    customer.refreshTokenHash = null;
    customer.refreshTokenExpires = null;

    await customer.save();

    res.status(200).json({
      message: "Password reset successfully. You can now login.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      message: "Server error while resetting password",
    });
  }
});

// ================= LOGIN CUSTOMER =================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const customer = await Customer.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!customer) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      customer.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create a token without automatic expiry
    const token = createAccessToken(customer);

    // Save token hash for manual logout and revocation
    customer.refreshTokenHash = hashAccessToken(token);
    customer.refreshTokenExpires = null;

    await customer.save();

    res.status(200).json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error during login",
    });
  }
});

// ================= LOGOUT CUSTOMER =================

router.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const tokenHash = hashAccessToken(token);

      await Customer.updateOne(
        {
          refreshTokenHash: tokenHash,
        },
        {
          $set: {
            refreshTokenHash: null,
            refreshTokenExpires: null,
          },
        }
      );
    }

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      message: "Server error during logout",
    });
  }
});

// ================= GET ALL CUSTOMERS =================

router.get("/", protectAdmin, async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");

    res.json(customers);
  } catch (error) {
    console.error("Fetch customers error:", error);

    res.status(500).json({
      message: "Error fetching customers",
    });
  }
});

module.exports = router;
