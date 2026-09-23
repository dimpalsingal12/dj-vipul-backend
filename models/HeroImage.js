const mongoose = require("mongoose");

const heroImageSchema = new mongoose.Schema(
  {
    imageUrl: {
      type: String,
      required: true,
    },

    publicId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const HeroImage = mongoose.model("HeroImage", heroImageSchema);

module.exports = HeroImage;