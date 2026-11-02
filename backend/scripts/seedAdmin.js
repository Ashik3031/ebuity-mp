import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from '../models/adminModel.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL;

async function seedAdmin() {
  try {
    if (!MONGO_URI) {
      console.log('No MONGO_URI provided.');
      return;
    }
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const email = 'admin@roseessence.ae';
    const existing = await Admin.findOne({ email });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('AdminPass123!', salt);

    if (existing) {
      existing.password = hashedPassword;
      existing.isAdmin = true;
      existing.role = 'admin';
      existing.name = 'Fatima Al Mansoori';
      await existing.save();
      console.log('Admin updated successfully: admin@roseessence.ae / AdminPass123!');
    } else {
      await Admin.create({
        name: 'Fatima Al Mansoori',
        email,
        password: hashedPassword,
        role: 'admin',
        isAdmin: true,
      });
      console.log('Admin created successfully: admin@roseessence.ae / AdminPass123!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed admin error:', error);
    process.exit(1);
  }
}

seedAdmin();
