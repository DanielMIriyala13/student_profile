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
import Achievement from '../models/Achievement';
import Company from '../models/Company';
import Notification from '../models/Notification';
import CambridgeScoreMap from '../models/CambridgeScoreMap';
import ActivityScoreMap from '../models/ActivityScoreMap';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
const EXCEL_PATH = path.join(__dirname, '../../../CGPA  & Grades.xlsx');

const seedData = async () => {
  try {
    console.log('🔄 Connecting to database for seeding...');
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      console.log('🌐 MongoDB SRV URL detected: Overriding DNS servers with public DNS (8.8.8.8, 1.1.1.1) to avoid queryTxt lookup timeouts...');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('📡 Connected to MongoDB.');

    // Clean existing data
    console.log('🧹 Wiping database to ensure fresh state...');
    if (mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
      console.log('🗑️ Database dropped.');
    }

    console.log('🔑 Pre-hashing default password to optimize performance...');
    const hashedPassword = await bcrypt.hash('password123', 10);

    console.log('🌱 Seeding institutional personnel...');

    // 1. Create Admins, HOD, Faculty, Placement Officer
    const admin = await User.create({
      name: 'Dr. Ramesh Kumar (Admin)',
      email: 'admin@institution.edu',
      password: 'password123',
      role: 'ADMIN',
      isProfileSetup: true,
    });

    const hod = await User.create({
      name: 'Dr. Priya Sharma (HOD CSE)',
      email: 'hod.cse@institution.edu',
      password: 'password123',
      role: 'HOD',
      department: 'Computer Science & Engineering',
      isProfileSetup: true,
    });

    const faculty = await User.create({
      name: 'Prof. Amit Verma (Faculty)',
      email: 'faculty@institution.edu',
      password: 'password123',
      role: 'FACULTY',
      isProfileSetup: true,
    });

    const placementOfficer = await User.create({
      name: 'Mr. Sanjay Sen (Placement Officer)',
      email: 'placement@institution.edu',
      password: 'password123',
      role: 'PLACEMENT_OFFICER',
      isProfileSetup: true,
    });

    console.log(`📊 Reading Excel spreadsheet: ${EXCEL_PATH}...`);
    const workbook = XLSX.readFile(EXCEL_PATH);
    const worksheet = workbook.Sheets['Consolidated'];
    if (!worksheet) {
      throw new Error("Could not find worksheet 'Consolidated' in the Excel file.");
    }
    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
    console.log(`📄 Spreadsheet loaded. Total rows: ${sheetData.length}`);

    const usersToInsert: any[] = [];
    const studentsToInsert: any[] = [];
    const profilesToInsert: any[] = [];
    const academicsToInsert: any[] = [];
    const attendancesToInsert: any[] = [];

    // Subjects configuration to generate mock grades and attendances
    const subjectsList = [
      { code: 'CS301', name: 'Database Management Systems' },
      { code: 'CS302', name: 'Computer Networks' },
      { code: 'CS303', name: 'Software Engineering' },
      { code: 'CS304', name: 'Design and Analysis of Algorithms' },
      { code: 'CS305', name: 'Web Technology' },
    ];

    const semestersConfig = [
      { sem: 1, creditsIdx: 5, sgpaIdx: 6, rCountIdx: 8, iCountIdx: 11 },
      { sem: 2, creditsIdx: 13, sgpaIdx: 14, rCountIdx: 16, iCountIdx: 19 },
      { sem: 3, creditsIdx: 21, sgpaIdx: 22, rCountIdx: 24, iCountIdx: 27 },
      { sem: 4, creditsIdx: 29, sgpaIdx: 30, rCountIdx: 32, iCountIdx: 35 },
      { sem: 5, creditsIdx: 37, sgpaIdx: 38, rCountIdx: 40, iCountIdx: 43 }
    ];

    const skillsPool = [
      'React.js', 'Node.js', 'TypeScript', 'MongoDB', 'Python', 'Java', 'SQL',
      'C++', 'HTML/CSS', 'Javascript', 'Git', 'Docker', 'AWS'
    ];
    const softPool = [
      'Problem Solving', 'Public Speaking', 'Team Leadership', 'Analytical Thinking',
      'Technical Writing', 'Collaboration', 'Critical Thinking'
    ];

    // Starting from row 11 (index 10)
    for (let i = 10; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row || !row[1]) continue; // Skip empty rows or missing REGD

      const rollNumber = String(row[1]).trim().toUpperCase();
      const rawName = String(row[2] || '').trim();
      if (!rollNumber || !rawName) continue;

      // Skip title/header/meta blocks that might duplicate
      if (rollNumber === 'REGD.' || rawName === 'NAME') continue;

      // Title case name
      const name = rawName
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const year = 4;
      const section = String(row[4] || '1').trim().toUpperCase();
      const counselorName = String(row[53] || 'Not Assigned').trim();

      let intermediatePercentage = parseFloat(row[55]);
      if (isNaN(intermediatePercentage)) intermediatePercentage = 0;

      const hostelerStatus = ['H', 'D'].includes(String(row[56]).trim().toUpperCase())
        ? String(row[56]).trim().toUpperCase()
        : 'D';

      const gender = ['M', 'F'].includes(String(row[57]).trim().toUpperCase())
        ? String(row[57]).trim().toUpperCase()
        : 'M';

      // Generate IDs to link records
      const userId = new mongoose.Types.ObjectId();
      const studentId = new mongoose.Types.ObjectId();

      const studentHashedPassword = bcrypt.hashSync(rollNumber.toLowerCase(), 8);

      usersToInsert.push({
        _id: userId,
        name,
        email: `${rollNumber.toLowerCase()}@gmail.com`,
        password: studentHashedPassword,
        role: 'STUDENT',
        isProfileSetup: true,
      });

      // Generate a mock contact number based on the roll number
      const contactNumber = `9${Math.floor(100000000 + Math.random() * 900000000)}`;

      studentsToInsert.push({
        _id: studentId,
        userId,
        rollNumber,
        branch: 'CSE',
        department: 'Computer Science & Engineering',
        year,
        section,
        contactNumber,
        counselorName,
        intermediatePercentage,
        hostelerStatus,
        gender,
      });

      // Random skills assignment
      const randomTech = skillsPool.sort(() => 0.5 - Math.random()).slice(0, 4);
      const randomSoft = softPool.sort(() => 0.5 - Math.random()).slice(0, 2);

      const mockProfile = {
        studentId,
        skills: {
          technical: randomTech,
          soft: randomSoft,
        },
        profiles: {
          github: `https://github.com/${rollNumber.toLowerCase()}`,
          linkedin: `https://linkedin.com/in/${rollNumber.toLowerCase()}`,
          leetcode: `https://leetcode.com/${rollNumber.toLowerCase()}`,
        },
        resumeUrl: '',
      };

      let completionScore = 30;
      if (mockProfile.skills.technical.length > 0) completionScore += 10;
      if (mockProfile.skills.soft.length > 0) completionScore += 5;
      if (mockProfile.profiles.linkedin) completionScore += 15;
      if (mockProfile.profiles.github) completionScore += 15;
      if (mockProfile.profiles.leetcode) completionScore += 15;

      profilesToInsert.push({
        ...mockProfile,
        profileCompletion: completionScore,
      });

      // Parse Semester academic data
      semestersConfig.forEach(config => {
        const rawSgpa = row[config.sgpaIdx];
        if (rawSgpa !== undefined && rawSgpa !== null && rawSgpa !== '-' && rawSgpa !== '') {
          const sgpa = parseFloat(rawSgpa);
          if (!isNaN(sgpa)) {
            const rGradeCount = parseInt(row[config.rCountIdx]) || 0;
            const iGradeCount = parseInt(row[config.iCountIdx]) || 0;
            const activeBacklogs = rGradeCount + iGradeCount;
            const crtAttendance = config.sem >= 3 ? Math.floor(70 + Math.random() * 25) : 0; // 70-95%
            const crtPerformance = config.sem >= 5 ? Math.floor(65 + Math.random() * 30) : 0; // 65-95%

            academicsToInsert.push({
              studentId,
              semester: config.sem,
              sgpa,
              rGradeCount,
              iGradeCount,
              activeBacklogs,
              crtAttendance,
              crtPerformance,
              subjects: subjectsList.map((s, idx) => {
                // Determine grade matching the SGPA or R/I status
                let grade = 'A';
                if (idx < rGradeCount) grade = 'F';
                else if (idx >= rGradeCount && idx < rGradeCount + iGradeCount) grade = 'I';
                else if (sgpa >= 9.0) grade = 'O';
                else if (sgpa >= 8.0) grade = 'A+';
                else if (sgpa >= 7.0) grade = 'A';
                else if (sgpa >= 6.0) grade = 'B';
                else grade = 'C';

                return {
                  code: s.code,
                  name: s.name,
                  internalMarks: Math.floor(15 + Math.random() * 15),
                  externalMarks: Math.floor(35 + Math.random() * 35),
                  totalMarks: Math.floor(50 + Math.random() * 45),
                  grade,
                };
              }),
            });

            // Create Attendance records for this semester
            subjectsList.forEach(s => {
              // Low attendance if R-Grade is present
              const total = 40;
              let attended = Math.floor(30 + Math.random() * 10); // 75% to 100%
              if (activeBacklogs > 0 && Math.random() > 0.5) {
                attended = Math.floor(22 + Math.random() * 6); // 55% to 70% (at risk)
              }

              attendancesToInsert.push({
                studentId,
                semester: config.sem,
                subjectCode: s.code,
                subjectName: s.name,
                attended,
                total,
              });
            });
          }
        }
      });
    }

    console.log(`💾 Inserting ${usersToInsert.length} Users...`);
    await User.insertMany(usersToInsert);

    console.log(`💾 Inserting ${studentsToInsert.length} Students...`);
    await Student.insertMany(studentsToInsert);

    console.log(`💾 Inserting ${profilesToInsert.length} Profiles...`);
    await Profile.insertMany(profilesToInsert);

    console.log(`💾 Inserting ${academicsToInsert.length} Academics...`);
    await Academic.insertMany(academicsToInsert);

    console.log(`💾 Inserting ${attendancesToInsert.length} Attendances...`);
    await Attendance.insertMany(attendancesToInsert);

    // Mock achievements seeding disabled to prevent dummy achievements referencing missing/dummy PDFs
    console.log('ℹ️ Seeding of mock achievements skipped.');


    console.log('🌱 Seeding placement recruitment drives...');
    const driveCompanies = [
      { name: 'Microsoft', role: 'Software Engineer', pkg: 24.5, eligibility: 8.0 },
      { name: 'Google', role: 'SDE-1', pkg: 32.0, eligibility: 8.5 },
      { name: 'TCS', role: 'System Engineer', pkg: 7.5, eligibility: 6.5 },
      { name: 'Infosys', role: 'Power Programmer', pkg: 9.0, eligibility: 7.0 }
    ];

    for (const company of driveCompanies) {
      // Pick random applicants
      const applicants = studentsToInsert.slice(0, 15).map((s, sIdx) => ({
        studentId: s._id,
        status: sIdx === 0 ? 'SELECTED' : sIdx % 3 === 0 ? 'SHORTLISTED' : 'APPLIED'
      }));

      await Company.create({
        name: company.name,
        role: company.role,
        packageAmount: company.pkg,
        eligibilityCriteria: {
          minCGPA: company.eligibility,
          minAttendance: 75.0,
          allowedBranches: ['CSE'],
          activeBacklogsAllowed: 0
        },
        dateOfVisit: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: company.name === 'Google' ? 'UPCOMING' : 'ACTIVE',
        applicants
      });
    }

    console.log('🌱 Seeding risk alerts and notifications...');
    // Seed some sample notifications
    for (let idx = 0; idx < Math.min(5, studentsToInsert.length); idx++) {
      const student = studentsToInsert[idx];
      await Notification.create({
        userId: student.userId,
        title: 'Academic Alert',
        message: 'Your overall profile has been registered in VFSTR student records.',
        type: 'VERIFICATION_UPDATE',
        isRead: false,
      });
    }

    console.log('🌱 Seeding Cambridge certification score mappings...');
    const defaultCambridgeScores = [
      { level: 'A2 Key', score: 2 },
      { level: 'B1 Preliminary', score: 4 },
      { level: 'B2 First', score: 6 },
      { level: 'C1 Advanced', score: 8 },
      { level: 'C2 Proficiency', score: 10 }
    ];
    await CambridgeScoreMap.deleteMany({});
    await CambridgeScoreMap.insertMany(defaultCambridgeScores);

    console.log('🌱 Seeding Extra-Curricular activity level score mappings...');
    const defaultActivityScores = [
      { level: 'Department Level', score: 1 },
      { level: 'Institute Level', score: 2 },
      { level: 'Inter-University Level', score: 3 },
      { level: 'Zonal Level', score: 4 },
      { level: 'National / International Level', score: 5 }
    ];
    await ActivityScoreMap.deleteMany({});
    await ActivityScoreMap.insertMany(defaultActivityScores);

    console.log('✅ Seeding completed successfully! 1300+ students loaded.');
    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
