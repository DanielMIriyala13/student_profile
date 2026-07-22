import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Student from '../models/Student';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
const offset = Math.max(0, Number(process.argv[2]) || 0);
const limit = Math.max(1, Number(process.argv[3]) || 0);

const updateCredentials = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Find all student records
    const query = Student.find({}).sort({ _id: 1 }).skip(offset);
    if (limit) query.limit(limit);
    const students = await query;
    console.log(`Found ${students.length} students to update (offset ${offset}${limit ? `, limit ${limit}` : ''}).`);

    let updatedCount = 0;
    let missingUserCount = 0;
    const batchSize = 50;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (student) => {
          if (!student.rollNumber) return;

          const rollLower = student.rollNumber.trim().toLowerCase();
          const newEmail = `${rollLower}@gmail.com`;
          // Find the associated User record
          const user = await User.findById(student.userId);
          if (user) {
            user.email = newEmail;
            // User's pre-save hook hashes modified passwords. Assigning an
            // already-hashed value here caused bcrypt(passwordHash) and made
            // bcrypt.compare(registrationNumber, storedHash) fail.
            user.password = rollLower;
            await user.save();
            updatedCount++;
          } else {
            missingUserCount++;
          }
        })
      );
      console.log(`⚙️ Progress: Updated ${Math.min(i + batchSize, students.length)} / ${students.length} students...`);
    }

    console.log(`🎉 Update complete!`);
    console.log(`- Updated: ${updatedCount} users`);
    if (missingUserCount > 0) {
      console.log(`- Warning: ${missingUserCount} students had no associated User record.`);
    }

  } catch (err) {
    console.error('❌ Error during update:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
};

updateCredentials();
