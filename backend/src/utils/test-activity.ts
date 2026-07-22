import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

import Student from '../models/Student';
import ActivityScoreMap from '../models/ActivityScoreMap';
import ActivityCertification from '../models/ActivityCertification';
import ActivityScore from '../models/ActivityScore';
import { calculateAndStoreActivityScore } from '../services/activityScoringService';

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
    await ActivityCertification.deleteMany({ studentId: studentId as any });
    await ActivityScore.deleteMany({ studentId: studentId as any });
    console.log('🧹 Cleaned previous activities records.');

    // 2. Test Mappings Setup Validation
    const mappings: any[] = await ActivityScoreMap.find({});
    console.log(`Loaded Level Score Mappings (${mappings.length}):`);
    mappings.forEach(m => console.log(`  - ${m.level}: ${m.score}`));
    if (mappings.length === 0) {
      throw new Error('No Activity score mappings found. Please run npm run seed first.');
    }

    // Helper to get score mapping
    const getExpectedScore = (level: string) => {
      const found = mappings.find(m => m.level === level);
      return found ? found.score : 0;
    };

    // --- TEST CASE 1: Pending certificate contributions ---
    console.log('\n--- Test Case 1: Pending Certificate ---');
    const cert1: any = await ActivityCertification.create({
      studentId: studentId as any,
      academicYear: 1,
      activityName: 'VFSTR Cultural Fest Solo Dance',
      category: 'Cultural',
      activityLevel: 'Institute Level',
      studentSelectedLevel: 'Institute Level',
      calculatedScore: getExpectedScore('Institute Level'),
      provider: 'VFSTR',
      issueDate: new Date('2026-01-01'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'PENDING',
    });

    await calculateAndStoreActivityScore(studentId, 1);
    let scoreYear1: any = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`Year 1 Capped Score with PENDING certificate: ${scoreYear1?.score || 0} (Expected: 0)`);
    console.log(`Year 1 Uncapped Points with PENDING certificate: ${scoreYear1?.totalPoints || 0} (Expected: 0)`);
    if (scoreYear1 && scoreYear1.score !== 0) {
      throw new Error('FAIL: Pending certificate contributed points to activities score.');
    }

    // --- TEST CASE 2: Faculty Approval & Score caching ---
    console.log('\n--- Test Case 2: Faculty Approval (Institute Level = 2 points) ---');
    cert1.status = 'APPROVED';
    cert1.facultyApprovedLevel = 'Institute Level';
    cert1.facultyApprovedScore = getExpectedScore('Institute Level');
    cert1.approvedAt = new Date();
    await cert1.save();

    await calculateAndStoreActivityScore(studentId, 1);
    scoreYear1 = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`Year 1 Capped Score: ${scoreYear1?.score} (Expected: 2)`);
    console.log(`Year 1 Uncapped Points: ${scoreYear1?.totalPoints} (Expected: 2)`);
    if (!scoreYear1 || scoreYear1.score !== 2 || scoreYear1.totalPoints !== 2) {
      throw new Error('FAIL: Faculty approval did not cache the activity score correctly.');
    }

    // --- TEST CASE 3: Year 1 Cap threshold of 10 points ---
    console.log('\n--- Test Case 3: Capping Threshold Year 1 (Cap: 10 points) ---');
    // Add two National / International Levels (5 points each) to Year 1. Total points = 2 + 5 + 5 = 12. Capped score must be 10.
    const cert2: any = await ActivityCertification.create({
      studentId: studentId as any,
      academicYear: 1,
      activityName: 'National NCC Camp',
      category: 'NCC',
      activityLevel: 'National / International Level',
      studentSelectedLevel: 'National / International Level',
      calculatedScore: getExpectedScore('National / International Level'),
      provider: 'NCC India',
      issueDate: new Date('2026-02-01'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'National / International Level',
      facultyApprovedScore: getExpectedScore('National / International Level'),
      approvedAt: new Date(),
    });

    const cert3: any = await ActivityCertification.create({
      studentId: studentId as any,
      academicYear: 1,
      activityName: 'International Youth Sports Meet',
      category: 'Sports',
      activityLevel: 'National / International Level',
      studentSelectedLevel: 'National / International Level',
      calculatedScore: getExpectedScore('National / International Level'),
      provider: 'Sports Council',
      issueDate: new Date('2026-03-01'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'National / International Level',
      facultyApprovedScore: getExpectedScore('National / International Level'),
      approvedAt: new Date(),
    });

    await calculateAndStoreActivityScore(studentId, 1);
    scoreYear1 = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`Year 1 Capped Score: ${scoreYear1?.score} (Expected: 5)`);
    console.log(`Year 1 Uncapped Points: ${scoreYear1?.totalPoints} (Expected: 12)`);
    if (!scoreYear1 || scoreYear1.score !== 5 || scoreYear1.totalPoints !== 12) {
      throw new Error('FAIL: Capping rules for Year 1 not applied correctly.');
    }

    // --- TEST CASE 4: Year 3 Cap threshold of 5 points ---
    console.log('\n--- Test Case 4: Capping Threshold Year 3 (Cap: 5 points) ---');
    // Add Inter-University Level (3 points) and Zonal Level (4 points) to Year 3. Total points = 7. Capped score must be 5.
    await ActivityCertification.create({
      studentId: studentId as any,
      academicYear: 3,
      activityName: 'Inter-University Cricket Tournament',
      category: 'Sports',
      activityLevel: 'Inter-University Level',
      studentSelectedLevel: 'Inter-University Level',
      calculatedScore: getExpectedScore('Inter-University Level'),
      provider: 'AIU',
      issueDate: new Date('2026-04-01'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'Inter-University Level',
      facultyApprovedScore: getExpectedScore('Inter-University Level'),
      approvedAt: new Date(),
    });

    await ActivityCertification.create({
      studentId: studentId as any,
      academicYear: 3,
      activityName: 'Zonal Technical Paper Presentation',
      category: 'Technical Event',
      activityLevel: 'Zonal Level',
      studentSelectedLevel: 'Zonal Level',
      calculatedScore: getExpectedScore('Zonal Level'),
      provider: 'IEEE Zone 1',
      issueDate: new Date('2026-05-01'),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'Zonal Level',
      facultyApprovedScore: getExpectedScore('Zonal Level'),
      approvedAt: new Date(),
    });

    await calculateAndStoreActivityScore(studentId, 3);
    const scoreYear3: any = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 3 } as any);
    console.log(`Year 3 Capped Score: ${scoreYear3?.score} (Expected: 5)`);
    console.log(`Year 3 Uncapped Points: ${scoreYear3?.totalPoints} (Expected: 7)`);
    if (!scoreYear3 || scoreYear3.score !== 5 || scoreYear3.totalPoints !== 7) {
      throw new Error('FAIL: Capping rules for Year 3 not applied correctly.');
    }

    // --- TEST CASE 5: Status Reversion on Edits ---
    console.log('\n--- Test Case 5: Student Edits Approved Certificate ---');
    // Student edits cert2 (National level, 5 pts). Status resets to PENDING.
    // Score for Year 1 should only sum cert1 (2 pts) + cert3 (5 pts) = 7 pts. Capped score should be 7.
    cert2.activityName = 'Updated NCC Certificate';
    cert2.status = 'PENDING';
    cert2.facultyApprovedLevel = undefined;
    cert2.facultyApprovedScore = undefined;
    await cert2.save();

    await calculateAndStoreActivityScore(studentId, 1);
    scoreYear1 = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`After Edit - Year 1 Capped Score: ${scoreYear1?.score} (Expected: 5)`);
    console.log(`After Edit - Year 1 Uncapped Points: ${scoreYear1?.totalPoints} (Expected: 7)`);
    if (!scoreYear1 || scoreYear1.score !== 5 || scoreYear1.totalPoints !== 7) {
      throw new Error('FAIL: Status did not revert to PENDING or update scores on edit.');
    }

    // --- TEST CASE 6: Recalculation on Deletion ---
    console.log('\n--- Test Case 6: Delete Certificate ---');
    // Delete cert3 (National level, 5 pts). Score drops to 2 (only cert1 remains approved).
    await ActivityCertification.findByIdAndDelete(cert3._id);
    await calculateAndStoreActivityScore(studentId, 1);
    scoreYear1 = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 1 } as any);
    console.log(`After Delete - Year 1 Capped Score: ${scoreYear1?.score || 0} (Expected: 2)`);
    console.log(`After Delete - Year 1 Uncapped Points: ${scoreYear1?.totalPoints || 0} (Expected: 2)`);
    if (!scoreYear1 || scoreYear1.score !== 2 || scoreYear1.totalPoints !== 2) {
      throw new Error('FAIL: Deletion did not recalculate points correctly.');
    }

    // --- TEST CASE 7: Fourth Year Capping rule (Max Cap = 0) ---
    console.log('\n--- Test Case 7: Fourth Year Capping ---');
    await ActivityCertification.create({
      studentId: studentId as any,
      academicYear: 4,
      activityName: 'Year 4 Co-Curricular Activity',
      category: 'Co-Curricular',
      activityLevel: 'National / International Level',
      studentSelectedLevel: 'National / International Level',
      calculatedScore: getExpectedScore('National / International Level'),
      provider: 'SAC',
      issueDate: new Date(),
      certificateFile: 'http://localhost:5000/uploads/dummy.pdf',
      status: 'APPROVED',
      facultyApprovedLevel: 'National / International Level',
      facultyApprovedScore: getExpectedScore('National / International Level'),
      approvedAt: new Date(),
    });

    await calculateAndStoreActivityScore(studentId, 4);
    const scoreYear4 = await ActivityScore.findOne({ studentId: studentId as any, academicYear: 4 } as any);
    console.log(`Year 4 Capped Score: ${scoreYear4?.score || 0} (Expected: 0)`);
    console.log(`Year 4 Uncapped Points: ${scoreYear4?.totalPoints || 0} (Expected: 5)`);
    if (!scoreYear4 || scoreYear4.score !== 0 || scoreYear4.totalPoints !== 5) {
      throw new Error('FAIL: Year 4 capping rules not applied correctly (Expected score: 0).');
    }

    console.log('\n🎉 ALL EXTRA-CURRICULAR / ACTIVITIES MODULE TEST CASES PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error(`❌ TEST FAILED: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database.');
  }
};

runTests();
