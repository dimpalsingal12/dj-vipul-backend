const express = require("express");
const multer = require("multer");
const Gallery = require("../models/Gallery");
const cloudinary = require("../config/cloudinary");
const { protectAdmin } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

// ================= GET ALL GALLERY MEDIA =================
// Public route - website visitors can view gallery

router.get("/", async (req, res) => {
  try {
    const gallery = await Gallery.find().sort({
      category: 1,
      order: 1,
      createdAt: 1,
    });

    res.json(gallery);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch gallery",
      error: error.message,
    });
  }
});

// ================= ADD PHOTO / VIDEO =================
// Admin only

router.post(
  "/upload",
  protectAdmin,
  upload.single("media"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a file",
        });
      }

      const { category } = req.body;

      if (!["events", "dj", "live"].includes(category)) {
        return res.status(400).json({
          message: "Invalid gallery category",
        });
      }

      const isVideo = req.file.mimetype.startsWith("video");

      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: isVideo ? "video" : "image",
            folder: "dj-vipul-gallery",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        stream.end(req.file.buffer);
      });

      const lastItem = await Gallery.findOne({ category }).sort({
        order: -1,
      });

      const newOrder = lastItem ? lastItem.order + 1 : 1;

      const galleryItem = await Gallery.create({
        mediaType: isVideo ? "video" : "image",
        category,
        mediaUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        order: newOrder,
      });

      res.status(201).json({
        message: "Media uploaded successfully",
        galleryItem,
      });
    } catch (error) {
      res.status(500).json({
        message: "Upload failed",
        error: error.message,
      });
    }
  }
);

// ================= UPDATE ORDER =================
// Admin only
// IMPORTANT: This must come BEFORE /:id

router.put("/order/update", protectAdmin, async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({
        message: "Invalid order data",
      });
    }

    await Promise.all(
      items.map((item) =>
        Gallery.findByIdAndUpdate(item.id, {
          order: item.order,
        })
      )
    );

    res.json({
      message: "Gallery order updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Order update failed",
      error: error.message,
    });
  }
});

// ================= UPDATE CATEGORY =================
// Admin only

router.put("/:id", protectAdmin, async (req, res) => {
  try {
    const { category } = req.body;

    if (!["events", "dj", "live"].includes(category)) {
      return res.status(400).json({
        message: "Invalid gallery category",
      });
    }

    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Media not found",
      });
    }

    const lastItem = await Gallery.findOne({
      category,
    }).sort({
      order: -1,
    });

    const newOrder = lastItem ? lastItem.order + 1 : 1;

    item.category = category;
    item.order = newOrder;

    await item.save();

    res.json({
      message: "Gallery updated successfully",
      galleryItem: item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Update failed",
      error: error.message,
    });
  }
});

// ================= DELETE MEDIA =================
// Admin only

router.delete("/:id", protectAdmin, async (req, res) => {
  try {
    const item = await Gallery.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        message: "Media not found",
      });
    }

    await cloudinary.uploader.destroy(item.publicId, {
      resource_type:
        item.mediaType === "video"
          ? "video"
          : "image",
    });

    await Gallery.findByIdAndDelete(req.params.id);

    res.json({
      message: "Media deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Delete failed",
      error: error.message,
    });
  }
});

module.exports = router;