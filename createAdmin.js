const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("./models/Admin");

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected!");

    const existingAdmin = await Admin.findOne();

    if (existingAdmin) {
      existingAdmin.username = process.env.ADMIN_USERNAME;

      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD,
        10
      );

      existingAdmin.password = hashedPassword;

      await existingAdmin.save();

      console.log("Admin credentials updated successfully!");

      process.exit();
    }

    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD,
      10
    );

    const admin = new Admin({
      username: process.env.ADMIN_USERNAME,
      password: hashedPassword,
    });

    await admin.save();

    console.log("Admin account created successfully!");

    process.exit();
  } catch (error) {
    console.error("Error changing admin:", error);
    process.exit(1);
  }
};

createAdmin();