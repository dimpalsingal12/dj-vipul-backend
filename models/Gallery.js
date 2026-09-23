const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    category: {
      type: String,
      enum: ["events", "dj", "live"],
      required: true,
    },

    mediaUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Gallery", gallerySchema);