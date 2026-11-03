import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, subject, service, message, date } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please provide your full name (minimum 2 characters)." },
        { status: 400 }
      );
    }

    // Validate email
    if (
      !email ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Validate phone (optional or validated if present)
    if (phone && (typeof phone !== "string" || phone.trim().length < 7)) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid phone number (at least 7 digits)." },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: "Please enter your message or enquiry details." },
        { status: 400 }
      );
    }

    const topic = subject || service || "General Enquiry";

    // Log enquiry details
    console.log("=== New Client Enquiry Received ===");
    console.log({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : "Not provided",
      topic,
      date: date || "Flexible",
      message: message.trim(),
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Thank you for contacting Rose Essence. Your enquiry has been received and our concierge will reach out to you shortly.",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error handling contact submission:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "An unexpected error occurred while submitting your enquiry. Please try again or reach out to our concierge directly.",
      },
      { status: 500 }
    );
  }
}
