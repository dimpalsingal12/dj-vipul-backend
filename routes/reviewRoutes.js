const express = require("express");
const Review = require("../models/Review");
const {
  protectAdmin,
  protectCustomer,
} = require("../middleware/auth");

const router = express.Router();

// ================= GET ALL REVIEWS =================
// Public route - anyone can view reviews

router.get("/", async (req, res) => {
  try {
    const reviews = await Review.find().sort({
      order: 1,
      createdAt: -1,
    });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching reviews",
    });
  }
});

// ================= ADD A REVIEW =================
// Customer only

router.post("/", protectCustomer, async (req, res) => {
  try {
    const { customerName, rating, comment } = req.body;

    if (!customerName || !rating || !comment) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const lastReview = await Review.findOne().sort({
      order: -1,
    });

    const newOrder = lastReview
      ? lastReview.order + 1
      : 0;

    const review = new Review({
      customerName,
      rating,
      comment,
      order: newOrder,
    });

    const savedReview = await review.save();

    res.status(201).json(savedReview);
  } catch (error) {
    res.status(500).json({
      message: "Error adding review",
    });
  }
});

// ================= DELETE A REVIEW =================
// Admin only

router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Review deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting review",
    });
  }
});

// ================= CHANGE REVIEW ORDER =================
// Admin only

router.put("/reorder", protectAdmin, async (req, res) => {
  try {
    const { reviewIds } = req.body;

    if (!Array.isArray(reviewIds)) {
      return res.status(400).json({
        message: "Invalid review order",
      });
    }

    for (let i = 0; i < reviewIds.length; i++) {
      await Review.findByIdAndUpdate(
        reviewIds[i],
        {
          order: i,
        }
      );
    }

    res.status(200).json({
      message: "Review order updated successfully",
    });
  } catch (error) {
    console.error("Error updating review order:", error);

    res.status(500).json({
      message: "Error updating review order",
    });
  }
});

module.exports = router;