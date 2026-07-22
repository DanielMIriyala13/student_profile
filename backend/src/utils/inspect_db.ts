import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Student from '../models/Student';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';

const inspectDb = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const userCount = await User.countDocuments({});
    const studentCount = await Student.countDocuments({});
    console.log(`Total Users in DB: ${userCount}`);
    console.log(`Total Students in DB: ${studentCount}`);

    const sampleUsers = await User.find({ role: 'STUDENT' }).limit(5).lean() as any[];
    console.log('Sample STUDENT Users:');
    sampleUsers.forEach((u) => {
      console.log(`ID: ${u._id}, Email: ${u.email}, isProfileSetup: ${u.isProfileSetup}`);
    });

    const sampleStudents = await Student.find({}).limit(5).lean() as any[];
    console.log('Sample Students:');
    sampleStudents.forEach((s) => {
      console.log(`ID: ${s._id}, Roll: ${s.rollNumber}, counselorName: ${s.counselorName}`);
    });

    const nonStudents = await User.find({ role: { $ne: 'STUDENT' } }).lean() as any[];
    console.log('Non-Student Users:');
    nonStudents.forEach((u) => {
      console.log(`Role: ${u.role}, Email: ${u.email}`);
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

inspectDb();
