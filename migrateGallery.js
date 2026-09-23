const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const cloudinary = require("./config/cloudinary");
const Gallery = require("./models/Gallery");

// CHANGE THIS ONLY IF YOUR FRONTEND FOLDER HAS A DIFFERENT NAME
const galleryFolder = path.join(
  __dirname,
  "../my-react-app/src/assets/gallery"
);

const eventPhotos = Array.from(
  { length: 14 },
  (_, i) => `es${i + 1}.jpeg`
);

const djPhotos = Array.from(
  { length: 10 },
  (_, i) => `dj${i + 1}.jpeg`
);

const videos = Array.from(
  { length: 12 },
  (_, i) => `vi${i + 1}.mp4`
);

const uploadFile = (filePath, mediaType) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: mediaType === "video" ? "video" : "image",
        folder: "dj-vipul-gallery",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
  });
};

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    const existingCount = await Gallery.countDocuments();

    if (existingCount > 0) {
      console.log(
        `Gallery already contains ${existingCount} items.`
      );
      console.log("Migration stopped to prevent duplicates.");
      process.exit(0);
    }

    let order = 1;

    // EVENTS
    for (const file of eventPhotos) {
      const filePath = path.join(galleryFolder, file);

      if (!fs.existsSync(filePath)) {
        console.log(`Missing file: ${file}`);
        continue;
      }

      console.log(`Uploading ${file}...`);

      const result = await uploadFile(filePath, "image");

      await Gallery.create({
        mediaType: "image",
        category: "events",
        mediaUrl: result.secure_url,
        publicId: result.public_id,
        order: order++,
      });

      console.log(`${file} added`);
    }

    // DJ VIPUL
    order = 1;

    for (const file of djPhotos) {
      const filePath = path.join(galleryFolder, file);

      if (!fs.existsSync(filePath)) {
        console.log(`Missing file: ${file}`);
        continue;
      }

      console.log(`Uploading ${file}...`);

      const result = await uploadFile(filePath, "image");

      await Gallery.create({
        mediaType: "image",
        category: "dj",
        mediaUrl: result.secure_url,
        publicId: result.public_id,
        order: order++,
      });

      console.log(`${file} added`);
    }

    // LIVE VIDEOS
    order = 1;

    for (const file of videos) {
      const filePath = path.join(galleryFolder, file);

      if (!fs.existsSync(filePath)) {
        console.log(`Missing file: ${file}`);
        continue;
      }

      console.log(`Uploading ${file}...`);

      const result = await uploadFile(filePath, "video");

      await Gallery.create({
        mediaType: "video",
        category: "live",
        mediaUrl: result.secure_url,
        publicId: result.public_id,
        order: order++,
      });

      console.log(`${file} added`);
    }

    console.log("================================");
    console.log("Gallery migration completed!");
    console.log("================================");

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();