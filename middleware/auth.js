
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Customer = require("../models/Customer");

// ================= GENERAL TOKEN PROTECTION =================

const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Authentication required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid authentication token.",
    });
  }
};

// ================= ADMIN PROTECTION =================

const protectAdmin = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required.",
      });
    }

    next();
  });
};

// ================= CUSTOMER PROTECTION =================

const protectCustomer = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Customer login required.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "customer") {
      return res.status(403).json({
        message: "Customer access required.",
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const customer = await Customer.findOne({
      _id: decoded.id,
      refreshTokenHash: tokenHash,
    });

    if (!customer) {
      return res.status(401).json({
        message: "Please login again.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid customer authentication.",
    });
  }
};

module.exports = {
  protect,
  protectAdmin,
  protectCustomer,
};
