const express = require("express");
const Booking = require("../models/Booking");
const transporter = require("../config/emailService");

const router = express.Router();

// ================= GET ALL BOOKINGS - ADMIN =================

router.get("/", async (req, res) => {
  try {
    const bookings = await Booking.find().sort({
      createdAt: -1,
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching all bookings:", error);

    res.status(500).json({
      message: "Server error while fetching bookings",
    });
  }
});

// ================= GET CUSTOMER BOOKINGS =================

router.get("/my-bookings/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const bookings = await Booking.find({ email }).sort({
      createdAt: -1,
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);

    res.status(500).json({
      message: "Server error while fetching bookings",
    });
  }
});

// ================= CUSTOMER CANCEL BOOKING =================

router.put("/:id/cancel", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Customer email is required",
      });
    }

    // Find the booking
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // Make sure customer can cancel only their own booking
    if (booking.email !== email) {
      return res.status(403).json({
        message: "You can only cancel your own booking",
      });
    }

    // Only Pending or Accepted bookings can be cancelled
    if (!["Pending", "Accepted"].includes(booking.status)) {
      return res.status(400).json({
        message: "This booking cannot be cancelled",
      });
    }

    // Change status to Cancelled
    booking.status = "Cancelled";

    await booking.save();

    res.status(200).json({
      message: "Booking cancelled successfully",
      booking: booking,
    });

  } catch (error) {
    console.error("Error cancelling booking:", error);

    res.status(500).json({
      message: "Server error while cancelling booking",
    });
  }
});

// ================= CUSTOMER DELETE BOOKING =================

router.delete("/:id", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Customer email is required",
      });
    }

    // Find the booking
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // Make sure customer can delete only their own booking
    if (booking.email !== email) {
      return res.status(403).json({
        message: "You can only delete your own booking",
      });
    }

    // Permanently delete the booking
    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Booking deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting booking:", error);

    res.status(500).json({
      message: "Server error while deleting booking",
    });
  }
});

// ================= ACCEPT OR REJECT BOOKING =================

router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    // Check valid status
    if (!["Accepted", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid booking status",
      });
    }

    // Update booking status
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    // ================= SEND ACCEPTANCE EMAIL =================

    if (status === "Accepted") {
      await transporter.sendMail({
        from: `"DJ Vipul Professional Sound & Lights" <${process.env.EMAIL_USER}>`,
        to: booking.email,
        cc: process.env.EMAIL_USER,
        subject: "Your Booking Request Has Been Accepted | DJ Vipul",

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 650px;
            margin: auto;
            padding: 25px;
            color: #222;
            border: 1px solid #dddddd;
            border-radius: 10px;
            line-height: 1.6;
          ">

            <h2 style="
              color: #d4af37;
              text-align: center;
            ">
              DJ Vipul Professional Sound & Lights
            </h2>

            <p>Dear <strong>${booking.customerName}</strong>,</p>

            <p>
              Thank you for choosing
              <strong>DJ Vipul Professional Sound & Lights</strong>
              for your special occasion.
            </p>

            <p style="
              color: green;
              font-size: 18px;
              font-weight: bold;
            ">
              Your booking request has been accepted!
            </p>

            <p>
              We are pleased to inform you that your booking request has
              been accepted by our team.
            </p>

            <h3 style="color: #d4af37;">
              Booking Details
            </h3>

            <table style="
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            ">

              <tr>
                <td style="
                  padding: 10px;
                  border: 1px solid #dddddd;
                  font-weight: bold;
                ">
                  Event Type
                </td>

                <td style="
                  padding: 10px;
                  border: 1px solid #dddddd;
                ">
                  ${booking.eventType}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border: 1px solid #dddddd;
                  font-weight: bold;
                ">
                  Event Date
                </td>

                <td style="
                  padding: 10px;
                  border: 1px solid #dddddd;
                ">
                  ${new Date(booking.eventDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </td>
              </tr>

              <tr>
                <td style="
                  padding: 10px;
                  border: 1px solid #dddddd;
                  font-weight: bold;
                ">
                  Venue
                </td>

                <td style="
                  padding: 10px;
                  border: 1px solid #dddddd;
                ">
                  ${booking.venue}
                </td>
              </tr>

            </table>

            <div style="
              background-color: #fff4f4;
              border-left: 5px solid #b00020;
              padding: 15px;
              margin: 20px 0;
            ">

              <h3 style="color: #b00020;">
                Important Notice
              </h3>

              <p>
                Please note that this acceptance is
                <strong>not the final confirmation</strong>
                of your event.
              </p>

              <p>
                For pricing, payment, availability, timings, and all
                further arrangements, please speak directly with
                <strong>DJ Vipul</strong>.
              </p>

              <p>
                <strong>
                  Do not make any payment or proceed with further
                  arrangements without discussing and confirming
                  everything directly with DJ Vipul.
                </strong>
              </p>

            </div>

            <h3 style="color: #d4af37;">
              Contact DJ Vipul
            </h3>

            <p>
              For the next steps, please contact us directly:
            </p>

            <p>
              <strong>Phone:</strong>
              ${process.env.BUSINESS_PHONE || "Business phone number"}
            </p>

            <p>
              We look forward to making your event memorable.
            </p>

            <p>
              Warm regards,<br />
              <strong>DJ Vipul Professional Sound & Lights</strong><br />
              Mumbai
            </p>

            <hr style="
              border: 0;
              border-top: 1px solid #dddddd;
            " />

            <p style="
              font-size: 12px;
              color: #777777;
              text-align: center;
            ">
              This is an automated email. Please contact DJ Vipul
              directly for any further assistance.
            </p>

          </div>
        `,
      });
    }

    // Send updated booking to frontend
    res.status(200).json(booking);

  } catch (error) {
    console.error("Error updating booking:", error);

    res.status(500).json({
      message: "Server error while updating booking",
    });
  }
});

module.exports = router;