import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

import Student from '../models/Student';
import User from '../models/User';
import CambridgeScoreMap from '../models/CambridgeScoreMap';
import CambridgeCertification from '../models/CambridgeCertification';
import CommunicationScore from '../models/CommunicationScore';
import { calculateAndStoreCommunicationScore } from '../services/communicationScoringService';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';

const runTests = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // 1. Fetch a student from the seeded database
    const student: any = await Student.findOne();
    if (!student) {
      throw new Error('No students found in the database. Please run npm run seed first.');
    }
    const studentId = student._id.toString();
    console.log(`Using Student ID: ${studentId} (${student.rollNumber})`);

    // Clean existing test data for this student
    await CambridgeCertification.deleteMany({ studentId: studentId as any });
    await CommunicationScore.deleteMany({ studentId: studentId as any });
    console.log('🧹 Cleaned previous test records.');

    // 2. Test Mappings Setup Validation
    const mappings: any[] = await CambridgeScoreMap.find({});
    console.log(`Loaded Level Score Mappings (${mappings.length}):`);
    mappings.forEach(m => console.log(`  - ${m.level}: ${m.score}`));
    if (mappings.length === 0) {
      throw new Error('No Cambridge score mappings found. Please run npm run seed first.');
    }

    // Helper to get score mapping
    const getExpectedScore = (level: string) => {
      const found = mappings.find(m => m.level === level);
      return found ? found.score : 0;
    };

    // --- TEST CASE 1: Pending certificate contributions ---
    console.log('\n--- Test Case 1: Pending Certificate ---');
    const cert1: any = await CambridgeCertification.create({
      studentId: studentId as any,
      academicYear: 1,
      certificateName: 'IELTS General English Certificate',
      provider: 'Cambridge English',
      certificateNumber: 'CAMB001',
      issueDate: new Date('2026-01-01'),
      certificateLevel: 'B2 First',
      studentSelectedLevel: 'B2 First',
      calculatedScore: getExpectedScore('B2 First'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'PENDING',
    });

    await calculateAndStoreCommunicationScore(studentId, 1);
    let scoreYear1: any = await CommunicationScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`Year 1 Capped Score with PENDING certificate: ${scoreYear1?.score || 0} (Expected: 0)`);
    console.log(`Year 1 Uncapped Points with PENDING certificate: ${scoreYear1?.totalPoints || 0} (Expected: 0)`);
    if (scoreYear1 && scoreYear1.score !== 0) {
      throw new Error('FAIL: Pending certificate contributed points to score.');
    }

    // --- TEST CASE 2: Faculty Approval & Score caching ---
    console.log('\n--- Test Case 2: Faculty Approval (B2 First = 6 points) ---');
    cert1.status = 'APPROVED';
    cert1.facultyApprovedLevel = 'B2 First';
    cert1.facultyApprovedScore = getExpectedScore('B2 First');
    cert1.approvedAt = new Date();
    await cert1.save();

    await calculateAndStoreCommunicationScore(studentId, 1);
    scoreYear1 = await CommunicationScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`Year 1 Capped Score: ${scoreYear1?.score} (Expected: 6)`);
    console.log(`Year 1 Uncapped Points: ${scoreYear1?.totalPoints} (Expected: 6)`);
    if (!scoreYear1 || scoreYear1.score !== 6 || scoreYear1.totalPoints !== 6) {
      throw new Error('FAIL: Faculty approval did not cache the score correctly.');
    }

    // --- TEST CASE 3: Year 1 & 2 Cap threshold of 10 points ---
    console.log('\n--- Test Case 3: Capping Threshold Year 1 & 2 (Cap: 10 points) ---');
    // Add C1 Advanced (8 points) to Year 1. Total points = 6 + 8 = 14. Capped score must be 10.
    const cert2: any = await CambridgeCertification.create({
      studentId: studentId as any,
      academicYear: 1,
      certificateName: 'Cambridge English Advanced C1',
      provider: 'Cambridge English',
      certificateNumber: 'CAMB002',
      issueDate: new Date('2026-02-01'),
      certificateLevel: 'C1 Advanced',
      studentSelectedLevel: 'C1 Advanced',
      calculatedScore: getExpectedScore('C1 Advanced'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'C1 Advanced',
      facultyApprovedScore: getExpectedScore('C1 Advanced'),
      approvedAt: new Date(),
    });

    await calculateAndStoreCommunicationScore(studentId, 1);
    scoreYear1 = await CommunicationScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`Year 1 Capped Score: ${scoreYear1?.score} (Expected: 10)`);
    console.log(`Year 1 Uncapped Points: ${scoreYear1?.totalPoints} (Expected: 14)`);
    if (!scoreYear1 || scoreYear1.score !== 10 || scoreYear1.totalPoints !== 14) {
      throw new Error('FAIL: Capping rules for Year 1 & 2 not applied correctly.');
    }

    // --- TEST CASE 4: Year 3 & 4 Cap threshold of 5 points ---
    console.log('\n--- Test Case 4: Capping Threshold Year 3 & 4 (Cap: 5 points) ---');
    // Add B2 First (6 points) to Year 3. Total points = 6. Capped score must be 5.
    const cert3: any = await CambridgeCertification.create({
      studentId: studentId as any,
      academicYear: 3,
      certificateName: 'Cambridge IELTS Academic',
      provider: 'Cambridge English',
      certificateNumber: 'CAMB003',
      issueDate: new Date('2026-03-01'),
      certificateLevel: 'B2 First',
      studentSelectedLevel: 'B2 First',
      calculatedScore: getExpectedScore('B2 First'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'B2 First',
      facultyApprovedScore: getExpectedScore('B2 First'),
      approvedAt: new Date(),
    });

    await calculateAndStoreCommunicationScore(studentId, 3);
    const scoreYear3: any = await CommunicationScore.findOne({ studentId: studentId as any, academicYear: 3 } as any);
    console.log(`Year 3 Capped Score: ${scoreYear3?.score} (Expected: 5)`);
    console.log(`Year 3 Uncapped Points: ${scoreYear3?.totalPoints} (Expected: 6)`);
    if (!scoreYear3 || scoreYear3.score !== 5 || scoreYear3.totalPoints !== 6) {
      throw new Error('FAIL: Capping rules for Year 3 & 4 not applied correctly.');
    }

    // --- TEST CASE 5: Status reversion & recalculation on Student Edits ---
    console.log('\n--- Test Case 5: Edit approved certification ---');
    // Student edits cert1 (B2 First, 6 pts). It resets to PENDING and approvedScore is removed.
    // Score should only come from cert2 (C1 Advanced, 8 pts). Capped score should be 8.
    cert1.certificateName = 'Updated IELTS Certificate';
    cert1.status = 'PENDING';
    cert1.facultyApprovedLevel = undefined;
    cert1.facultyApprovedScore = undefined;
    await cert1.save();

    await calculateAndStoreCommunicationScore(studentId, 1);
    scoreYear1 = await CommunicationScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`After Edit - Year 1 Capped Score: ${scoreYear1?.score} (Expected: 8)`);
    console.log(`After Edit - Year 1 Uncapped Points: ${scoreYear1?.totalPoints} (Expected: 8)`);
    if (!scoreYear1 || scoreYear1.score !== 8 || scoreYear1.totalPoints !== 8) {
      throw new Error('FAIL: Edit did not revert status to PENDING or update scores.');
    }

    // --- TEST CASE 6: Recalculation on Deletion ---
    console.log('\n--- Test Case 6: Delete certification ---');
    // Delete cert2 (C1 Advanced, 8 pts). Score drops to 0 (cert1 is still pending).
    await CambridgeCertification.findByIdAndDelete(cert2._id);
    await calculateAndStoreCommunicationScore(studentId, 1);
    scoreYear1 = await CommunicationScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`After Delete - Year 1 Capped Score: ${scoreYear1?.score || 0} (Expected: 0)`);
    console.log(`After Delete - Year 1 Uncapped Points: ${scoreYear1?.totalPoints || 0} (Expected: 0)`);
    if (scoreYear1 && scoreYear1.score !== 0) {
      throw new Error('FAIL: Deletion did not trigger score update.');
    }

    console.log('\n🎉 ALL CAMBRIDGE MODULE TEST CASES PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error(`❌ TEST FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database.');
  }
};

runTests();
