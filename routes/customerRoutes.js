const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const transporter = require("../config/emailService");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

// ================= REGISTER CUSTOMER =================

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Check if all fields are provided
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({
      email: email.toLowerCase(),
    });

    if (existingCustomer) {
      return res.status(400).json({
        message: "Customer with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create customer
    const customer = new Customer({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      isVerified: false,
      verificationToken: verificationToken,
    });

    await customer.save();

    // Create verification link
   const verificationLink =
  `${process.env.BACKEND_URL}/api/customers/verify-email/${verificationToken}`;

    // Send verification email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Verify Your Email - DJ Vipul",
      html: `
        <h2>Welcome to DJ Vipul Professional Sound & Lights!</h2>

        <p>Hello ${name},</p>

        <p>Thank you for registering on our website.</p>

        <p>Please click the button below to verify your email address:</p>

        <a href="${verificationLink}"
           style="
             display: inline-block;
             padding: 12px 20px;
             background-color: #d4af37;
             color: black;
             text-decoration: none;
             border-radius: 5px;
           ">
          Verify Email
        </a>

        <p>If you did not create this account, you can ignore this email.</p>

        <p>Regards,<br>DJ Vipul Team</p>
      `,
    });

    res.status(201).json({
      message:
        "Registration successful! Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

// ================= VERIFY EMAIL =================

router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    // Find customer using verification token
    const customer = await Customer.findOne({
      verificationToken: token,
    });

    if (!customer) {
      return res.status(400).send("Invalid or expired verification link.");
    }

    // Mark email as verified
    customer.isVerified = true;
    customer.verificationToken = null;

    await customer.save();

    res.send(`
  <h2>Email Verified Successfully!</h2>
  <p>Your email has been verified.</p>
  <p>You can now return to the DJ Vipul website and login.</p>

  <a href="${process.env.FRONTEND_URL}"
     style="
       display: inline-block;
       margin-top: 15px;
       padding: 12px 20px;
       background-color: #d4af37;
       color: black;
       text-decoration: none;
       border-radius: 5px;
     ">
    Go Back to Website
  </a>
  `);
  } catch (error) {
    console.error("Email verification error:", error);

    res.status(500).send("Server error during email verification.");
  }
});



// ================= FORGOT PASSWORD =================

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    // Find customer by email
    const customer = await Customer.findOne({
      email: email.toLowerCase(),
    });

    if (!customer) {
      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Save token and expiry time
    customer.resetPasswordToken = resetToken;
    customer.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

    await customer.save();

    // Create reset password link
    const resetLink =
  `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
    // Send reset email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
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

    // Check password
    if (!password) {
      return res.status(400).json({
        message: "New password is required",
      });
    }

    // Find customer using reset token
    const customer = await Customer.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!customer) {
      return res.status(400).json({
        message: "Invalid or expired reset link",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password
    customer.password = hashedPassword;

    // Remove reset token after use
    customer.resetPasswordToken = null;
    customer.resetPasswordExpires = null;

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

    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find customer by email
    const customer = await Customer.findOne({
      email: email.toLowerCase(),
    });

    if (!customer) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Check if email is verified
    if (!customer.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    // Compare entered password with hashed password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      customer.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        role: "customer",
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    // Login successful
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

// ================= GET ALL CUSTOMERS =================

router.get("/", protectAdmin, async (req, res) => {
  try {
    const customers = await Customer.find().select("-password");

    res.json(customers);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching customers",
    });
  }
});

module.exports = router;