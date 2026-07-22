import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import dns from 'dns';
import XLSX from 'xlsx';

import User from '../models/User';
import Student from '../models/Student';
import Profile from '../models/Profile';
import Academic from '../models/Academic';
import Attendance from '../models/Attendance';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
const EXCEL_PATH = '/home/maruthi-velaga/Documents/student_profile/shan.xlsx';

const subjectsList = [
  { code: 'CS201', name: 'Data Structures' },
  { code: 'CS202', name: 'Database Management Systems' },
  { code: 'CS203', name: 'Computer Networks' },
  { code: 'CS204', name: 'Operating Systems' },
  { code: 'CS205', name: 'Software Engineering' },
  { code: 'CS206', name: 'Theory of Computation' },
];

const importData = async () => {
  try {
    console.log('🔄 Connecting to database for importing...');
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      console.log('🌐 MongoDB SRV URL detected: Overriding DNS servers with public DNS (8.8.8.8, 1.1.1.1) to avoid queryTxt lookup timeouts...');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('📡 Connected to MongoDB.');

    console.log(`📊 Reading Excel spreadsheet: ${EXCEL_PATH}...`);
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = 'Student Data';
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Could not find worksheet '${sheetName}' in the Excel file.`);
    }

    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
    console.log(`📄 Spreadsheet loaded. Total rows: ${sheetData.length}`);

    // Fetch existing users to check for duplicates in memory
    console.log('🔍 Fetching existing users to identify duplicates...');
    const existingEmails = new Set(
      (await User.find({}, { email: 1 })).map(u => u.email.toLowerCase())
    );

    let skippedCount = 0;

    const usersToInsert: any[] = [];
    const studentsToInsert: any[] = [];
    const profilesToInsert: any[] = [];
    const academicsToInsert: any[] = [];
    const attendancesToInsert: any[] = [];

    // Pre-hash map to speed up identical hashes
    const hashedPasswordMap = new Map<string, string>();

    console.log('🛠️ Processing rows and compiling records...');
    // Start from row 4 (index 3)
    for (let i = 3; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || !row[1]) continue; // Skip empty rows or missing REGD

      const rollNumber = String(row[1]).trim().toUpperCase();
      const rawName = String(row[2] || '').trim();
      
      if (!rollNumber || !rawName) continue;
      if (rollNumber === 'REGISTRATION NUMBER' || rawName === 'NAME') continue;

      const email = `${rollNumber.toLowerCase()}@gmail.com`;

      // Fast check
      if (existingEmails.has(email)) {
        skippedCount++;
        continue;
      }

      // Title case name
      const name = rawName
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const mobileNo = row[3] ? String(row[3]).trim() : '9999999999';

      // Hash password (once per student, bypasses Mongoose hook during insertMany)
      let hashedPassword = hashedPasswordMap.get(rollNumber.toLowerCase());
      if (!hashedPassword) {
        hashedPassword = bcrypt.hashSync(rollNumber.toLowerCase(), 10);
        hashedPasswordMap.set(rollNumber.toLowerCase(), hashedPassword);
      }

      // Generate IDs to link records
      const userId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();

      // Compile User
      usersToInsert.push({
        _id: userId,
        name,
        email,
        password: hashedPassword,
        role: 'STUDENT',
        isProfileSetup: true,
      });

      // Compile Student
      studentsToInsert.push({
        _id: studentId,
        userId,
        rollNumber,
        branch: 'CSE',
        department: 'Computer Science & Engineering',
        year: 3,
        section: '1',
        contactNumber: mobileNo,
      });

      // Compile Profile
      profilesToInsert.push({
        studentId,
        skills: { technical: [], soft: [] },
        profiles: { github: '', linkedin: '', leetcode: '' },
        resumeUrl: '',
        profileCompletion: 30,
      });

      // Compile Academic records for sem 1 to 5
      for (let sem = 1; sem <= 5; sem++) {
        academicsToInsert.push({
          studentId,
          semester: sem,
          sgpa: 8.0,
          activeBacklogs: 0,
          clearedBacklogs: 0,
          rGradeCount: 0,
          iGradeCount: 0,
          crtAttendance: 80,
          crtPerformance: 80,
          subjects: subjectsList.map(s => ({
            code: s.code,
            name: s.name,
            internalMarks: 21,
            externalMarks: 49,
            totalMarks: 70,
            maxMarks: 100,
            grade: 'A',
          })),
        });

        // Compile Attendance records for sem 1 to 5 for each subject
        subjectsList.forEach(s => {
          attendancesToInsert.push({
            studentId,
            semester: sem,
            subjectCode: s.code,
            subjectName: s.name,
            attended: 32,
            total: 40,
          });
        });
      }
    }

    const totalToCreate = usersToInsert.length;
    console.log(`\n📦 Prepared ${totalToCreate} new student datasets.`);

    if (totalToCreate > 0) {
      console.log(`💾 Bulk inserting Users into Atlas...`);
      await User.insertMany(usersToInsert);

      console.log(`💾 Bulk inserting Students into Atlas...`);
      await Student.insertMany(studentsToInsert);

      console.log(`💾 Bulk inserting Profiles into Atlas...`);
      await Profile.insertMany(profilesToInsert);

      console.log(`💾 Bulk inserting Academics into Atlas...`);
      // Insert in chunks of 2000 to prevent Atlas payload limits
      const chunkSize = 2000;
      for (let k = 0; k < academicsToInsert.length; k += chunkSize) {
        const chunk = academicsToInsert.slice(k, k + chunkSize);
        await Academic.insertMany(chunk);
        console.log(`   └─ Inserted academics chunk (${Math.min(k + chunkSize, academicsToInsert.length)}/${academicsToInsert.length})`);
      }

      console.log(`💾 Bulk inserting Attendances into Atlas...`);
      for (let k = 0; k < attendancesToInsert.length; k += chunkSize) {
        const chunk = attendancesToInsert.slice(k, k + chunkSize);
        await Attendance.insertMany(chunk);
        console.log(`   └─ Inserted attendances chunk (${Math.min(k + chunkSize, attendancesToInsert.length)}/${attendancesToInsert.length})`);
      }
    }

    console.log(`\n🎉 Import & Seeding completed successfully!`);
    console.log(`✅ Created: ${totalToCreate} new students (and linked academics/attendance)`);
    console.log(`⚠️ Skipped: ${skippedCount} existing students (duplicates)`);

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
};

importData();
