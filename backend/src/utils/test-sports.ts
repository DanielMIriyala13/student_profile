import dns from 'dns';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Student from '../models/Student';
import User from '../models/User';
import PhysicalFitnessActivity from '../models/PhysicalFitnessActivity';
import PhysicalFitnessScore from '../models/PhysicalFitnessScore';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://127.0.0.1:6002/mad';

async function runTest() {
  console.log('🏁 Starting Physical Fitness / Sports Module Integration Tests...');

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
    await PhysicalFitnessActivity.deleteMany({ studentId: sampleStudent._id } as any);
    await PhysicalFitnessScore.deleteMany({ studentId: sampleStudent._id } as any);
    console.log('🧹 Cleaned existing sports activities and scores for test student.');

    // 4. Student submits sports activity
    console.log('\n🧪 Step 3: Student submits a Sports Certificate (Year 1)...');
    const formData = new FormData();
    formData.append('academicYear', '1');
    formData.append('activityName', '100m Athletics sprint');
    formData.append('eventName', 'Annual Sports Meet 2026');
    formData.append('organizer', 'VFSTR Sports Board');
    formData.append('eventDate', '2026-01-10');
    formData.append('description', 'Secured 2nd place in the sprint event');
    
    const fileBlob = new Blob(['dummy pdf certificate content'], { type: 'application/pdf' });
    formData.append('proofFile', fileBlob, 'sports_cert1.pdf');

    const submitRes = await fetch(`${BASE_URL}/physical-fitness`, {
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
    console.log(`✅ Activity submitted successfully (ID: ${actId}).`);

    // 5. Verify pending status in database
    const pendingAct = await PhysicalFitnessActivity.findById(actId);
    if (!pendingAct || pendingAct.status !== 'PENDING') {
      throw new Error('Verification failed: Status should be PENDING.');
    }
    console.log('✅ Checked database: Record is PENDING.');

    // 6. Faculty approves the activity
    console.log('\n🧪 Step 4: Faculty approves the Sports Activity...');
    const approveRes = await fetch(`${BASE_URL}/physical-fitness/${actId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        remarks: 'Approved. Valid certificate.'
      })
    });
    if (!approveRes.ok) {
      throw new Error(`Approval failed: ${await approveRes.text()}`);
    }
    const approvedResult = await approveRes.json() as any;
    console.log(`✅ Activity approved. Status: ${approvedResult.activity.status}.`);

    // Verify score card for Year 1
    const scoreY1 = await PhysicalFitnessScore.findOne({ studentId: sampleStudent._id, academicYear: 1 } as any);
    if (!scoreY1 || scoreY1.score !== 5 || scoreY1.totalPoints !== 1) {
      throw new Error(`Scoring validation failed. Expected score 5, totalPoints 1. Got score: ${scoreY1?.score}, totalPoints: ${scoreY1?.totalPoints}`);
    }
    console.log(`✅ Year 1 Sports Score verified: score = ${scoreY1.score}, totalPoints = ${scoreY1.totalPoints}`);

    // 7. Student submits another sports activity in Year 1 to test capping
    console.log('\n🧪 Step 5: Student uploads second sports certificate in Year 1...');
    const formData2 = new FormData();
    formData2.append('academicYear', '1');
    formData2.append('activityName', 'Yoga Championship');
    formData2.append('eventName', 'International Yoga Day');
    formData2.append('organizer', 'District Yoga Federation');
    formData2.append('eventDate', '2026-06-21');
    formData2.append('proofFile', fileBlob, 'yoga_cert.pdf');

    const submitRes2 = await fetch(`${BASE_URL}/physical-fitness`, {
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

    // Faculty approves the second activity
    const approveRes2 = await fetch(`${BASE_URL}/physical-fitness/${actId2}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ remarks: 'Approved second sports certificate.' })
    });
    if (!approveRes2.ok) {
      throw new Error(`Second approval failed: ${await approveRes2.text()}`);
    }
    console.log('✅ Second activity approved.');

    // Verify binary capping score for Year 1: remains 5, but totalPoints is 2
    const scoreY1Capped = await PhysicalFitnessScore.findOne({ studentId: sampleStudent._id, academicYear: 1 } as any);
    if (!scoreY1Capped || scoreY1Capped.score !== 5 || scoreY1Capped.totalPoints !== 2) {
      throw new Error(`Capping validation failed. Expected score 5, totalPoints 2. Got score: ${scoreY1Capped?.score}, totalPoints: ${scoreY1Capped?.totalPoints}`);
    }
    console.log(`✅ Year 1 Capping verified: score = ${scoreY1Capped.score}, totalPoints = ${scoreY1Capped.totalPoints} (capped at 5)`);

    // 8. Submit certificate for Year 3 (should result in 0 points)
    console.log('\n🧪 Step 6: Submit Sports Certificate for Year 3 (Expected score = 0)...');
    const formData3 = new FormData();
    formData3.append('academicYear', '3');
    formData3.append('activityName', 'Badminton Tournament');
    formData3.append('eventName', 'Inter-Dept Tournament');
    formData3.append('organizer', 'Vignan University');
    formData3.append('eventDate', '2026-03-12');
    formData3.append('proofFile', fileBlob, 'badminton.pdf');

    const submitRes3 = await fetch(`${BASE_URL}/physical-fitness`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: formData3
    });
    if (!submitRes3.ok) {
      throw new Error(`Year 3 submission failed: ${await submitRes3.text()}`);
    }
    const submitResult3 = await submitRes3.json() as any;
    const actId3 = submitResult3.activity._id;
    console.log(`✅ Year 3 activity submitted (ID: ${actId3}).`);

    // Faculty approves Year 3 activity
    const approveRes3 = await fetch(`${BASE_URL}/physical-fitness/${actId3}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({ remarks: 'Approved Year 3 sports certificate.' })
    });
    if (!approveRes3.ok) {
      throw new Error(`Year 3 approval failed: ${await approveRes3.text()}`);
    }
    console.log('✅ Year 3 activity approved.');

    // Verify Year 3 score card: score = 0, totalPoints = 1
    const scoreY3 = await PhysicalFitnessScore.findOne({ studentId: sampleStudent._id, academicYear: 3 } as any);
    if (!scoreY3 || scoreY3.score !== 0 || scoreY3.totalPoints !== 1) {
      throw new Error(`Year 3 validation failed. Expected score 0, totalPoints 1. Got score: ${scoreY3?.score}, totalPoints: ${scoreY3?.totalPoints}`);
    }
    console.log(`✅ Year 3 Sports Score verified: score = ${scoreY3.score}, totalPoints = ${scoreY3.totalPoints} (Year 3 policy is 0 points)`);

    // 9. Edit the first activity (should reset status to PENDING and recalculate Year 1 score)
    console.log('\n🧪 Step 7: Editing first sports activity (keeps academicYear as 1)...');
    const updateFormData = new FormData();
    updateFormData.append('academicYear', '1');
    updateFormData.append('activityName', '100m Athletics sprint (Edited)');
    updateFormData.append('eventName', 'Annual Sports Meet 2026');
    updateFormData.append('organizer', 'VFSTR Sports Board');
    updateFormData.append('eventDate', '2026-01-10');
    updateFormData.append('proofFile', fileBlob, 'sports_cert_edited.pdf');

    const updateRes = await fetch(`${BASE_URL}/physical-fitness/${actId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: updateFormData
    });
    if (!updateRes.ok) {
      throw new Error(`Edit failed: ${await updateRes.text()}`);
    }
    console.log('✅ First activity edited successfully. Status should be reverted to PENDING.');

    // Check database to ensure it went back to pending
    const editedAct = await PhysicalFitnessActivity.findById(actId);
    if (!editedAct || editedAct.status !== 'PENDING') {
      throw new Error(`Edit validation failed. Expected status PENDING, got: ${editedAct?.status}`);
    }
    console.log('✅ Checked database: First activity is indeed PENDING again.');

    // Recalculated Year 1 score should only count the second approved activity (so score is still 5, totalPoints is 1)
    const scoreY1AfterEdit = await PhysicalFitnessScore.findOne({ studentId: sampleStudent._id, academicYear: 1 } as any);
    if (!scoreY1AfterEdit || scoreY1AfterEdit.score !== 5 || scoreY1AfterEdit.totalPoints !== 1) {
      throw new Error(`Year 1 score validation after edit failed. Expected score 5, totalPoints 1. Got: ${scoreY1AfterEdit?.score}, totalPoints: ${scoreY1AfterEdit?.totalPoints}`);
    }
    console.log(`✅ Year 1 score after edit verified: score = ${scoreY1AfterEdit.score}, totalPoints = ${scoreY1AfterEdit.totalPoints}`);

    // Year 2 score should be 0 because the edited activity is PENDING
    const scoreY2AfterEdit = await PhysicalFitnessScore.findOne({ studentId: sampleStudent._id, academicYear: 2 } as any);
    const y2Score = scoreY2AfterEdit ? scoreY2AfterEdit.score : 0;
    const y2Points = scoreY2AfterEdit ? scoreY2AfterEdit.totalPoints : 0;
    if (y2Score !== 0 || y2Points !== 0) {
      throw new Error(`Year 2 score validation after edit failed. Expected score 0, totalPoints 0. Got: ${y2Score}, totalPoints: ${y2Points}`);
    }
    console.log('✅ Year 2 score after edit verified: score = 0, totalPoints = 0 (still pending).');

    // 10. Delete the second activity (should leave Year 1 with 0 approved activities, thus score = 0)
    console.log('\n🧪 Step 8: Deleting the second activity from Year 1...');
    const deleteRes = await fetch(`${BASE_URL}/physical-fitness/${actId2}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (!deleteRes.ok) {
      throw new Error(`Deletion failed: ${await deleteRes.text()}`);
    }
    console.log('✅ Second activity deleted successfully.');

    // Year 1 score should now drop to 0
    const scoreY1AfterDelete = await PhysicalFitnessScore.findOne({ studentId: sampleStudent._id, academicYear: 1 } as any);
    const y1ScoreDel = scoreY1AfterDelete ? scoreY1AfterDelete.score : 0;
    const y1PointsDel = scoreY1AfterDelete ? scoreY1AfterDelete.totalPoints : 0;
    if (y1ScoreDel !== 0 || y1PointsDel !== 0) {
      throw new Error(`Year 1 validation after delete failed. Expected score 0, totalPoints 0. Got: ${y1ScoreDel}, totalPoints: ${y1PointsDel}`);
    }
    console.log(`✅ Year 1 score after deletion verified: score = ${y1ScoreDel}, totalPoints = ${y1PointsDel}`);

    console.log('\n🎉 ALL PHYSICAL FITNESS / SPORTS SCORING MODULE TESTS PASSED SUCCESSFULLY! 🎉');

  } catch (err: any) {
    console.error('❌ Integration test failed with error:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Direct database connection closed.');
    process.exit(0);
  }
}

runTest();
