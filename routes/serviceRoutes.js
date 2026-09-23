const express = require("express");
const Service = require("../models/Service");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1, createdAt: 1 });
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching services",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        message: "Name and description are required",
      });
    }

    const lastService = await Service.findOne().sort({ order: -1 });

    const newOrder = lastService ? lastService.order + 1 : 1;

    const service = new Service({
      name,
      description,
      order: newOrder,
    });

    const savedService = await service.save();

    res.status(201).json(savedService);
  } catch (error) {
    res.status(500).json({
      message: "Error adding service",
    });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, description, active, order } = req.body;

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { name, description, active, order },
      { new: true }
    );

    res.status(200).json(updatedService);
  } catch (error) {
    res.status(500).json({
      message: "Error updating service",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Service deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting service",
    });
  }
});

module.exports = router;
