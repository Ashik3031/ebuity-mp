import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import mongoose from "mongoose";
import Staff from "../models/Staff.js";
import StaffAttendance from "../models/StaffAttendance.js";
import ServiceCategory from "../models/ServiceCategory.js";
import Service from "../models/Service.js";

async function seedStaff() {
  console.log("Seeding Level 5 Staff Profiles...");
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB.");

    // Retrieve categories
    const categories = await ServiceCategory.find().lean();
    const nailCat = categories.find((c) => /nail/i.test(c.name));
    const hairCat = categories.find((c) => /hair/i.test(c.name));
    const faceCat = categories.find((c) => /face|skin/i.test(c.name));
    const massageCat = categories.find((c) => /massage/i.test(c.name));

    const allServices = await Service.find().lean();

    const staffSeedData = [
      {
        name: "Fatima Al-Mansoor",
        email: "fatima@roseessence.ae",
        phone: "+971 50 123 4567",
        employeeId: "RE-EMP-1001",
        joiningDate: new Date("2024-01-15"),
        employmentStatus: "full-time",
        password: "Password123!",
        profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
        categoryIds: [nailCat?._id, faceCat?._id].filter(Boolean),
        serviceIds: allServices
          .filter((s) => /manicure|pedicure|facial/i.test(s.name))
          .map((s) => s._id),
        workingHours: { start: "09:00", end: "21:00" },
        breaks: [
          { start: "13:00", end: "14:00", label: "Lunch & Sanitation Break" },
        ],
        weeklyOffDays: [5], // Friday off
        holidays: ["2026-12-02", "2026-12-03"], // UAE National Day
        baseZoneName: "Downtown & Business Bay",
        isActive: true,
        notes: "Certified Master Nail & Facial Artist with 6 years experience in luxury Dubai spa salons.",
        leaves: [
          {
            startDate: new Date("2026-11-15T00:00:00Z"),
            endDate: new Date("2026-11-17T23:59:59Z"),
            reason: "Sister's Wedding in Abu Dhabi",
            status: "pending",
          },
        ],
      },
      {
        name: "Layla Zahran",
        email: "layla@roseessence.ae",
        phone: "+971 52 987 6543",
        employeeId: "RE-EMP-1002",
        joiningDate: new Date("2024-03-01"),
        employmentStatus: "full-time",
        password: "Password123!",
        profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
        categoryIds: [hairCat?._id, faceCat?._id].filter(Boolean),
        serviceIds: allServices
          .filter((s) => /hair|blowdry|makeup|style/i.test(s.name))
          .map((s) => s._id),
        workingHours: { start: "10:00", end: "22:00" },
        breaks: [
          { start: "14:00", end: "15:00", label: "Rest Break" },
        ],
        weeklyOffDays: [0], // Sunday off
        holidays: ["2026-12-02", "2026-12-03"],
        baseZoneName: "Dubai Marina & JBR",
        isActive: true,
        notes: "Celebrity hair stylist and VIP bridal specialist.",
        leaves: [],
      },
      {
        name: "Sarah Jenkins",
        email: "sarah@roseessence.ae",
        phone: "+971 55 456 7890",
        employeeId: "RE-EMP-1003",
        joiningDate: new Date("2024-05-20"),
        employmentStatus: "full-time",
        password: "Password123!",
        profileImage: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80",
        categoryIds: [massageCat?._id, faceCat?._id, nailCat?._id].filter(Boolean),
        serviceIds: allServices
          .filter((s) => /massage|glow|spa|relax/i.test(s.name))
          .map((s) => s._id),
        workingHours: { start: "09:00", end: "21:00" },
        breaks: [
          { start: "13:30", end: "14:30", label: "Lunch Break" },
        ],
        weeklyOffDays: [1], // Monday off
        holidays: ["2026-12-02", "2026-12-03"],
        baseZoneName: "Palm Jumeirah & Emirates Hills",
        isActive: true,
        notes: "Licensed holistic therapist specializing in aromatherapies and deep tissue massages.",
        leaves: [
          {
            startDate: new Date("2026-10-01T00:00:00Z"),
            endDate: new Date("2026-10-03T23:59:59Z"),
            reason: "Professional training workshop",
            status: "approved",
            reviewNotes: "Approved by Admin on Sep 28",
          },
        ],
      },
    ];

    for (const data of staffSeedData) {
      let existing = await Staff.findOne({ email: data.email });
      if (existing) {
        console.log(`Staff ${data.name} already exists. Updating skills and working hours.`);
        existing.employeeId = data.employeeId;
        existing.joiningDate = data.joiningDate;
        existing.employmentStatus = data.employmentStatus;
        existing.categoryIds = data.categoryIds;
        existing.serviceIds = data.serviceIds;
        existing.workingHours = data.workingHours;
        existing.breaks = data.breaks;
        existing.weeklyOffDays = data.weeklyOffDays;
        existing.holidays = data.holidays;
        existing.profileImage = data.profileImage;
        await existing.save();
      } else {
        existing = await Staff.create(data);
        console.log(`Created staff profile: ${existing.name} (${existing.email})`);
      }

      // Add today's check-in
      const todayStr = new Date().toISOString().split("T")[0];
      const existingAttendance = await StaffAttendance.findOne({
        staff: existing._id,
        date: todayStr,
      });

      if (!existingAttendance) {
        await StaffAttendance.create({
          staff: existing._id,
          date: todayStr,
          checkIn: new Date(Date.now() - 2 * 3600 * 1000), // Checked in 2 hours ago
          status: "present",
        });
        console.log(`  Added today's attendance for ${existing.name}`);
      }
    }

    console.log("Level 5 Staff Seeding Completed Successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Staff seeding failed:", err.message);
    process.exit(1);
  }
}

seedStaff();
