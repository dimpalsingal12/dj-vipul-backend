const express = require("express");
const multer = require("multer");
const HeroImage = require("../models/HeroImage");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

// GET CURRENT HERO IMAGE
router.get("/", async (req, res) => {
  try {
    const heroImage = await HeroImage.findOne();

    res.json(heroImage);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch hero image",
      error: error.message,
    });
  }
});

// UPLOAD / CHANGE HERO IMAGE
router.post("/upload", upload.single("heroImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Please select an image",
      });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: "dj-vipul-hero",
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

    // Check if a hero image already exists
    const existingHero = await HeroImage.findOne();

    if (existingHero) {
      // Delete old image from Cloudinary
      await cloudinary.uploader.destroy(existingHero.publicId);

      // Update existing record
      existingHero.imageUrl = uploadResult.secure_url;
      existingHero.publicId = uploadResult.public_id;

      await existingHero.save();

      return res.json({
        message: "Hero image changed successfully",
        heroImage: existingHero,
      });
    }

    // Create first hero image record
    const heroImage = await HeroImage.create({
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    });

    res.status(201).json({
      message: "Hero image uploaded successfully",
      heroImage,
    });
  } catch (error) {
    console.error("Hero image upload error:", error);

    res.status(500).json({
      message: "Hero image upload failed",
      error: error.message,
    });
  }
});

module.exports = router;