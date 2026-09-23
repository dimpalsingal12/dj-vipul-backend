const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const Booking = require("./models/Booking");
const Service = require("./models/Service");

const customerRoutes = require("./routes/customerRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const galleryRoutes = require("./routes/galleryRoutes");
const heroRoutes = require("./routes/heroRoutes");

const app = express();

const PORT = 5000;

app.use(express.json());
app.use(cors());

app.use("/api/customers", customerRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/hero", heroRoutes);

app.get("/", (req, res) => {
  res.send("DJ Vipul Backend is running!");
});

app.get("/services", (req, res) => {
  res.send("DJ Vipul Services");
});

app.post("/api/bookings", async (req, res) => {
  try {
    const booking = new Booking(req.body);

    const savedBooking = await booking.save();

    res.status(201).json(savedBooking);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

/* Temporary route to add existing website services */

app.get("/api/add-default-services", async (req, res) => {
  try {
    await Service.deleteMany({});

    await Service.insertMany([
      {
        name: "Weddings & Sangeet",
        description:
          "Music for celebrations, receptions and sangeet nights, from elegant moments to a packed dance floor.",
      },
      {
        name: "Private Celebrations",
        description:
          "Birthdays, anniversaries and private parties with music that follows the energy of the celebration.",
      },
      {
        name: "Corporate Events",
        description:
          "Professional entertainment for corporate events, launches and special celebrations.",
      },
      {
        name: "College & Club Events",
        description:
          "High-energy entertainment for college fests, club nights and lively crowds.",
      },
    ]);

    res.json({
      message: "Default services added successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error adding default services",
    });
  }
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((error) => {
    console.log("MongoDB connection failed:", error);
  });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});