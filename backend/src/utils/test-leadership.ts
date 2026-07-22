import dns from 'dns';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Student from '../models/Student';
import User from '../models/User';
import LeadershipActivity from '../models/LeadershipActivity';
import LeadershipScore from '../models/LeadershipScore';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://127.0.0.1:6002/mad';

async function runTest() {
  console.log('🏁 Starting Leadership Activities Module Integration Tests...');

  // Connect to DB directly
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
  await mongoose.connect(MONGO_URI);
  console.log('📡 Connected to MongoDB.');

  try {
    // 1. Get a student and their user
    const sampleStudent = await Student.findOne({});
    if (!sampleStudent) {
      throw new Error('No students found in the database. Run seed first.');
    }
    const studentUser = await User.findById(sampleStudent.userId);
    if (!studentUser) {
      throw new Error('Student user not found.');
    }

    const studentEmail = studentUser.email;
    console.log(`👤 Found Student: ${studentUser.name} (${sampleStudent.rollNumber}) with Email: ${studentEmail}`);

    // 2. Auth as Student
    console.log('\n🧪 Step 1: Authenticating as Student...');
    const studentAuthRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: sampleStudent.rollNumber.toLowerCase() })
    });
    if (!studentAuthRes.ok) {
      throw new Error(`Student auth failed: ${await studentAuthRes.text()}`);
    }
    const studentAuth = await studentAuthRes.json() as any;
    const studentToken = studentAuth.accessToken;
    console.log('✅ Student Authenticated successfully.');

    // 3. Auth as Faculty
    console.log('\n🧪 Step 2: Authenticating as Faculty...');
    const facultyAuthRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'faculty@institution.edu', password: 'password123' })
    });
    if (!facultyAuthRes.ok) {
      throw new Error(`Faculty auth failed: ${await facultyAuthRes.text()}`);
    }
    const facultyAuth = await facultyAuthRes.json() as any;
    const facultyToken = facultyAuth.accessToken;
    console.log('✅ Faculty Authenticated successfully.');

    // Cleanup existing records to isolate tests
    await LeadershipActivity.deleteMany({ studentId: sampleStudent._id } as any);
    await LeadershipScore.deleteMany({ studentId: sampleStudent._id } as any);
    console.log('🧹 Cleaned existing leadership activities and scores for test student.');

    // 4. Student submits leadership activity (CR / SAC Members -> 3 pts)
    console.log('\n🧪 Step 3: Student submits a Leadership Activity (Year 3)...');
    const formData = new FormData();
    formData.append('academicYear', '3');
    formData.append('organizationName', 'VFSTR Student Council');
    formData.append('leadershipRole', 'CR / LR / ARC / SAC – Members');
    formData.append('leadershipPosition', 'ARC Committee Member');
    formData.append('duration', '1 Year');
    formData.append('appointmentDate', '2025-06-10');
    formData.append('description', 'Representing student interest in ARC committees');
    
    const fileBlob = new Blob(['dummy pdf appointment letter content'], { type: 'application/pdf' });
    formData.append('proofFile', fileBlob, 'appointment.pdf');

    const submitRes = await fetch(`${BASE_URL}/leadership-activities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`
      },
      body: formData
    });

    if (!submitRes.ok) {
      throw new Error(`Submission failed: ${await submitRes.text()}`);
    }
    const submitResult = await submitRes.json() as any;
    const actId = submitResult.activity._id;
    console.log(`✅ Activity submitted successfully (ID: ${actId}, Student Caclulated Score: ${submitResult.activity.studentCalculatedScore}).`);

    // 5. Verify pending status in database
    const pendingAct = await LeadershipActivity.findById(actId);
    if (!pendingAct || pendingAct.status !== 'PENDING') {
      throw new Error('Verification failed: Status should be PENDING.');
    }
    console.log('✅ Checked database: Record is PENDING.');

    // 6. Faculty approves with OVERRIDE to 'Coordinators' (5 points)
    console.log('\n🧪 Step 4: Faculty approves with role override to Coordinators (5 pts)...');
    const approveRes = await fetch(`${BASE_URL}/leadership-activities/${actId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        leadershipRole: 'Coordinators',
        remarks: 'Excellent, student was the Chief Coordinator of SAC.'
      })
    });
    if (!approveRes.ok) {
      throw new Error(`Approval failed: ${await approveRes.text()}`);
    }
    const approvedResult = await approveRes.json() as any;
    console.log(`✅ Activity approved. Faculty approved role: ${approvedResult.activity.facultyApprovedRole}, Score: ${approvedResult.activity.facultyApprovedScore}.`);

    // Verify score card for Year 3
    const scoreY3 = await LeadershipScore.findOne({ studentId: sampleStudent._id, academicYear: 3 } as any);
    if (!scoreY3 || scoreY3.score !== 5 || scoreY3.totalPoints !== 5) {
      throw new Error(`Scoring validation failed. Expected score 5/5, got score: ${scoreY3?.score}, totalPoints: ${scoreY3?.totalPoints}`);
    }
    console.log(`✅ Year 3 Leadership Score verified: ${scoreY3.score} / ${scoreY3.totalPoints} points.`);

    // 7. Student submits another leadership activity in Year 3 (Coordinators -> 5 pts)
    console.log('\n🧪 Step 5: Student uploads second leadership activity in Year 3 to test capping...');
    const formData2 = new FormData();
    formData2.append('academicYear', '3');
    formData2.append('organizationName', 'IEEE Vignan Student Branch');
    formData2.append('leadershipRole', 'Coordinators');
    formData2.append('duration', '6 Months');
    formData2.append('proofFile', fileBlob, 'ieee_cert.pdf');

    const submitRes2 = await fetch(`${BASE_URL}/leadership-activities`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: formData2
    });
    if (!submitRes2.ok) {
      throw new Error(`Second submission failed: ${await submitRes2.text()}`);
    }
    const submitResult2 = await submitRes2.json() as any;
    const actId2 = submitResult2.activity._id;
    console.log(`✅ Second activity submitted successfully (ID: ${actId2}).`);

    // Faculty approves it
    const approveRes2 = await fetch(`${BASE_URL}/leadership-activities/${actId2}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ remarks: 'Approved' })
    });
    if (!approveRes2.ok) {
      throw new Error(`Second approval failed: ${await approveRes2.text()}`);
    }

    // Verify capping rules for Year 3 (totalPoints should be 5 + 5 = 10, but score should be capped at 5)
    const cappedScoreY3 = await LeadershipScore.findOne({ studentId: sampleStudent._id, academicYear: 3 } as any);
    if (!cappedScoreY3 || cappedScoreY3.score !== 5 || cappedScoreY3.totalPoints !== 10) {
      throw new Error(`Capping validation failed. Expected capped score: 5, total: 10. Got score: ${cappedScoreY3?.score}, total: ${cappedScoreY3?.totalPoints}`);
    }
    console.log(`✅ Year 3 Capped Leadership Score verified: Capped score = ${cappedScoreY3.score}, Uncapped total = ${cappedScoreY3.totalPoints}.`);

    // 8. Test Year 4 Special Rule: Cap = 0
    console.log('\n🧪 Step 6: Testing Fourth Year Capping rule (Max Cap = 0)...');
    const formDataY4 = new FormData();
    formDataY4.append('academicYear', '4');
    formDataY4.append('organizationName', 'SAC Volunteer Cell');
    formDataY4.append('leadershipRole', 'Coordinators');
    formDataY4.append('duration', '1 Year');
    formDataY4.append('proofFile', fileBlob, 'volunteer.pdf');

    const submitResY4 = await fetch(`${BASE_URL}/leadership-activities`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: formDataY4
    });
    if (!submitResY4.ok) {
      throw new Error(`Year 4 submission failed: ${await submitResY4.text()}`);
    }
    const submitResultY4 = await submitResY4.json() as any;
    const actIdY4 = submitResultY4.activity._id;
    console.log(`✅ Year 4 activity submitted (ID: ${actIdY4}).`);

    // Faculty approves Year 4 activity
    const approveResY4 = await fetch(`${BASE_URL}/leadership-activities/${actIdY4}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ remarks: 'SAC Chief Coordinator approved' })
    });
    if (!approveResY4.ok) {
      throw new Error(`Year 4 approval failed: ${await approveResY4.text()}`);
    }

    // Verify Year 4 score (totalPoints should be 5, but capped score MUST be 0)
    const scoreY4 = await LeadershipScore.findOne({ studentId: sampleStudent._id, academicYear: 4 } as any);
    if (!scoreY4 || scoreY4.score !== 0 || scoreY4.totalPoints !== 5) {
      throw new Error(`Year 4 Cap validation failed. Expected score 0, total 5. Got score: ${scoreY4?.score}, total: ${scoreY4?.totalPoints}`);
    }
    console.log(`✅ Year 4 Capping rule verified: Capped score = ${scoreY4.score}, Uncapped total = ${scoreY4.totalPoints}.`);

    // 9. Verify rejection remarks constraint
    console.log('\n🧪 Step 7: Testing Rejection feedback constraint...');
    const rejectRes = await fetch(`${BASE_URL}/leadership-activities/${actId2}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ remarks: '   ' }) // Empty/whitespace feedback
    });
    if (rejectRes.ok) {
      throw new Error('Rejection constraint failed: API allowed rejection with empty remarks.');
    }
    console.log('✅ Rejection with empty remarks blocked successfully.');

    // Reject with correct remarks
    const rejectRes2 = await fetch(`${BASE_URL}/leadership-activities/${actId2}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ remarks: 'Incorrect certificate uploaded.' })
    });
    if (!rejectRes2.ok) {
      throw new Error(`Rejection failed: ${await rejectRes2.text()}`);
    }
    console.log('✅ Activity rejected successfully with remarks.');

    // 10. Student updates rejected record. Assert status reverts to PENDING
    console.log('\n🧪 Step 8: Student updates/edits record...');
    const updateFormData = new FormData();
    updateFormData.append('organizationName', 'IEEE Vignan Student Chapter (Updated)');
    updateFormData.append('duration', '1 Year');

    const updateRes = await fetch(`${BASE_URL}/leadership-activities/${actId2}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: updateFormData
    });
    if (!updateRes.ok) {
      throw new Error(`Update failed: ${await updateRes.text()}`);
    }
    const updateResult = await updateRes.json() as any;
    if (updateResult.activity.status !== 'PENDING') {
      throw new Error(`Expected updated status to revert to PENDING, got: ${updateResult.activity.status}`);
    }
    console.log('✅ Update successful. Status successfully reverted to PENDING.');

    // 11. Delete activity and verify score recalculation
    console.log('\n🧪 Step 9: Testing activity deletion & score recalculation...');
    const deleteRes = await fetch(`${BASE_URL}/leadership-activities/${actId2}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (!deleteRes.ok) {
      throw new Error(`Deletion failed: ${await deleteRes.text()}`);
    }
    console.log('✅ Activity deleted successfully.');

    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Leadership activities module is operational.');
  } catch (err: any) {
    console.error(`\n❌ TEST FAILURE: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
