const jwt = require("jsonwebtoken");

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
      message: "Invalid or expired authentication token.",
    });
  }
};

// ================= ADMIN PROTECTION =================

const protectAdmin = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Access denied. Admin access required.",
      });
    }

    next();
  });
};

// ================= CUSTOMER PROTECTION =================

const protectCustomer = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== "customer") {
      return res.status(403).json({
        message: "Access denied. Customer access required.",
      });
    }

    next();
  });
};

module.exports = {
  protect,
  protectAdmin,
  protectCustomer,
};