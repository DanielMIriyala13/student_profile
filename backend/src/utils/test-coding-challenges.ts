import dns from 'dns';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Student from '../models/Student';
import User from '../models/User';
import CodingChallenge from '../models/CodingChallenge';
import CodingChallengeScore from '../models/CodingChallengeScore';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://127.0.0.1:6002/mad';

async function runTest() {
  console.log('🏁 Starting Coding Challenge / Hackathon Management Integration Tests...');

  // Connect to DB directly to grab student and verify final collections
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

    // Cleanup existing coding challenges for this student first to isolate tests
    await CodingChallenge.deleteMany({ studentId: sampleStudent._id } as any);
    await CodingChallengeScore.deleteMany({ studentId: sampleStudent._id } as any);
    console.log('🧹 Cleaned existing coding challenges and scores for test user.');

    // 4. Student uploads coding challenge submission
    console.log('\n🧪 Step 3: Student uploads a coding challenge / hackathon...');
    const formData = new FormData();
    formData.append('eventName', 'Smart India Hackathon 2026');
    formData.append('eventType', 'Hackathon');
    formData.append('organizer', 'Ministry of Education');
    formData.append('eventDate', '2026-05-15');
    formData.append('platform', 'Smart India Hackathon');
    formData.append('achievementCategory', 'Hackathon Merit'); // merit category (4 pts)
    formData.append('academicYear', '3'); // Academic Year 3
    formData.append('rank', '1st Place');
    formData.append('teamName', 'ByteBusters');
    formData.append('teamMembers', 'Alice, Bob, Charlie');
    formData.append('description', 'Innovative student portal solution');
    
    // Create a dummy text blob to act as file
    const fileBlob = new Blob(['dummy pdf certificate content'], { type: 'application/pdf' });
    formData.append('proofFile', fileBlob, 'proof.pdf');

    const uploadRes = await fetch(`${BASE_URL}/coding-challenges`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${await uploadRes.text()}`);
    }
    const uploadData = await uploadRes.json() as any;
    const challengeId = uploadData.challenge._id;
    console.log(`✅ Upload Succeeded! Created Challenge ID: ${challengeId} with Status: ${uploadData.challenge.status}, Calculated Score: ${uploadData.challenge.studentCalculatedScore}`);

    if (uploadData.challenge.studentCalculatedScore !== 4) {
      throw new Error(`Expected studentCalculatedScore to be 4, got: ${uploadData.challenge.studentCalculatedScore}`);
    }

    // Verify it appears in Student list with status PENDING
    const challengesRes = await fetch(`${BASE_URL}/coding-challenges/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const challengesData = await challengesRes.json() as any;
    const uploadedChallenge = challengesData.challenges.find((c: any) => c._id === challengeId);
    if (!uploadedChallenge || uploadedChallenge.status !== 'PENDING') {
      throw new Error(`Challenge not found or status not PENDING. Data: ${JSON.stringify(challengesData)}`);
    }
    console.log('✅ Verified: Challenge is visible in Student profile with status PENDING.');

    // Verify score is not calculated yet
    let currentScore = challengesData.scores.find((s: any) => s.academicYear === 3);
    if (currentScore && currentScore.score > 0) {
      throw new Error('Scoring engine pre-calculated pending challenge. Expected 0 points.');
    }
    console.log('✅ Verified: Challenge score is 0 before faculty approval.');

    // 5. Faculty views pending challenges
    console.log('\n🧪 Step 4: Faculty retrieves pending challenge requests...');
    const pendingRes = await fetch(`${BASE_URL}/coding-challenges/pending`, {
      headers: { 'Authorization': `Bearer ${facultyToken}` }
    });
    if (!pendingRes.ok) {
      throw new Error(`Pending fetch failed: ${await pendingRes.text()}`);
    }
    const pendingData = await pendingRes.json() as any;
    const challengeInQueue = pendingData.challenges.find((c: any) => c._id === challengeId);
    if (!challengeInQueue) {
      throw new Error('Uploaded challenge not visible in faculty pending queue.');
    }
    console.log(`✅ Verified: Challenge is visible in Faculty pending list. Student Selected Category: ${challengeInQueue.studentSelectedCategory}`);

    // 6. Faculty approves, overriding category to Hackathon Participation (worth 2 pts)
    console.log('\n🧪 Step 5: Faculty approves challenge, overrides category to Hackathon Participation (2 pts)...');
    const approveRes = await fetch(`${BASE_URL}/coding-challenges/${challengeId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        achievementCategory: 'Hackathon Participation',
      })
    });
    if (!approveRes.ok) {
      throw new Error(`Approval failed: ${await approveRes.text()}`);
    }
    const approveData = await approveRes.json() as any;
    console.log(`✅ Approved! Status: ${approveData.challenge.status}, Approved Category: ${approveData.challenge.facultyApprovedCategory}, Approved Score: ${approveData.challenge.facultyApprovedScore}`);

    if (approveData.challenge.facultyApprovedCategory !== 'Hackathon Participation' || approveData.challenge.facultyApprovedScore !== 2) {
      throw new Error('Faculty category or score overrides were not saved correctly.');
    }

    // Verify that the score database was updated
    const finalChallengesRes = await fetch(`${BASE_URL}/coding-challenges/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const finalChallengesData = await finalChallengesRes.json() as any;
    const finalScore = finalChallengesData.scores.find((s: any) => s.academicYear === 3);
    if (!finalScore || finalScore.score !== 2 || finalScore.totalPoints !== 2) {
      throw new Error(`Challenge score not updated or incorrect. Expected 2, got: ${JSON.stringify(finalScore)}`);
    }
    console.log(`✅ Verified: Capped score is ${finalScore.score} (Total Points: ${finalScore.totalPoints}).`);

    // 7. Test capping rule (max cap is 5 for Year 3). Let's upload a second Hackathon Merit (4 pts)
    console.log('\n🧪 Step 6: Testing Year-Wise Scoring Cap...');
    console.log('Uploading second challenge: Hackathon Merit (4 pts) for Year 3...');
    const formData2 = new FormData();
    formData2.append('eventName', 'Codeforces Round 999');
    formData2.append('eventType', 'Competitive Programming');
    formData2.append('organizer', 'Codeforces');
    formData2.append('eventDate', '2026-06-01');
    formData2.append('platform', 'Codeforces');
    formData2.append('achievementCategory', 'Hackathon Merit');
    formData2.append('academicYear', '3');
    formData2.append('proofFile', fileBlob, 'proof2.pdf');

    const uploadRes2 = await fetch(`${BASE_URL}/coding-challenges`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: formData2
    });
    const uploadData2 = await uploadRes2.json() as any;
    const challengeId2 = uploadData2.challenge._id;
    console.log(`Uploaded second challenge: ${challengeId2}`);

    // Approve the second challenge
    console.log('Faculty approves second challenge with direct score override to 4...');
    await fetch(`${BASE_URL}/coding-challenges/${challengeId2}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        facultyApprovedScore: 4
      })
    });

    // Check scores. Since we approved first (2 pts) and second (4 pts), total points = 6.
    // However, Year 3 maximum score is capped at 5. So score must be 5!
    const cappedScoreRes = await fetch(`${BASE_URL}/coding-challenges/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const cappedScoreData = await cappedScoreRes.json() as any;
    const cappedScore = cappedScoreData.scores.find((s: any) => s.academicYear === 3);
    
    if (!cappedScore || cappedScore.score !== 5 || cappedScore.totalPoints !== 6) {
      throw new Error(`Capping failed. Expected score 5 and total points 6. Got: ${JSON.stringify(cappedScore)}`);
    }
    console.log(`✅ Capping Rule Succeeded! Total Points = ${cappedScore.totalPoints}, Final Score = ${cappedScore.score} (Capped at 5)`);

    // Verify all records are still visible
    const visibleChallengesCount = cappedScoreData.challenges.length;
    if (visibleChallengesCount !== 2) {
      throw new Error(`Visible challenges count mismatch. Expected 2, got: ${visibleChallengesCount}`);
    }
    console.log(`✅ Verified: All ${visibleChallengesCount} challenges remain visible regardless of score cap.`);

    // 8. Rejection Rule: Faculty rejects challenge
    console.log('\n🧪 Step 7: Testing Rejection with mandatory feedback...');
    const rejectRes = await fetch(`${BASE_URL}/coding-challenges/${challengeId2}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        remarks: 'Invalid certificate file.' // feedback provided as remarks
      })
    });
    if (!rejectRes.ok) {
      throw new Error(`Rejection failed: ${await rejectRes.text()}`);
    }
    const rejectData = await rejectRes.json() as any;
    console.log(`✅ Rejected! Status: ${rejectData.challenge.status}, Rejection Feedback/Remarks: ${rejectData.challenge.remarks}`);

    // Verify score is recalculated. Rejected challenge does not contribute, so Year 3 score should revert to 2 (from first challenge).
    const afterRejectRes = await fetch(`${BASE_URL}/coding-challenges/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const afterRejectData = await afterRejectRes.json() as any;
    const afterRejectScore = afterRejectData.scores.find((s: any) => s.academicYear === 3);
    if (!afterRejectScore || afterRejectScore.score !== 2 || afterRejectScore.totalPoints !== 2) {
      throw new Error(`Score recalculation after rejection failed. Expected 2, got: ${JSON.stringify(afterRejectScore)}`);
    }
    console.log(`✅ Verified: Challenge score correctly recalculated to ${afterRejectScore.score} after rejection.`);

    // Verify rejected challenge remains visible in student profile
    const rejectedChallenge = afterRejectData.challenges.find((c: any) => c._id === challengeId2);
    if (!rejectedChallenge || rejectedChallenge.status !== 'REJECTED' || rejectedChallenge.remarks !== 'Invalid certificate file.') {
      throw new Error(`Rejected challenge not visible or remarks missing. Got: ${JSON.stringify(rejectedChallenge)}`);
    }
    console.log('✅ Verified: Rejected challenge remains visible with feedback.');

    // 9. Edit Rule: If student edits challenge, status becomes PENDING
    console.log('\n🧪 Step 8: Testing Edit Rule...');
    const editFormData = new FormData();
    editFormData.append('eventName', 'Smart India Hackathon 2026 (Edited)');
    editFormData.append('eventType', 'Hackathon');
    editFormData.append('organizer', 'Ministry of Education');
    editFormData.append('achievementCategory', 'Hackathon Merit');
    editFormData.append('academicYear', '3');
    
    const editRes = await fetch(`${BASE_URL}/coding-challenges/${challengeId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: editFormData
    });
    if (!editRes.ok) {
      throw new Error(`Edit failed: ${await editRes.text()}`);
    }
    const editData = await editRes.json() as any;
    console.log(`✅ Edit Succeeded! Challenge status: ${editData.challenge.status}`);
    
    // Verify score becomes 0 again since the edit reverted it to PENDING
    const afterEditRes = await fetch(`${BASE_URL}/coding-challenges/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const afterEditData = await afterEditRes.json() as any;
    const afterEditScore = afterEditData.scores.find((s: any) => s.academicYear === 3);
    if (afterEditScore && afterEditScore.score > 0) {
      throw new Error(`Score not recalculated to 0 after revert to PENDING. Score: ${afterEditScore.score}`);
    }
    console.log('✅ Verified: Score reverted to 0 after editing (since status became PENDING).');

    // 10. Delete Rule: If approved challenge is deleted, immediately recalculate
    console.log('\n🧪 Step 9: Testing Delete Rule...');
    // Approve it again first
    await fetch(`${BASE_URL}/coding-challenges/${challengeId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      }
    });
    console.log('Approved challenge again.');

    // Delete it
    const deleteRes = await fetch(`${BASE_URL}/coding-challenges/${challengeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (!deleteRes.ok) {
      throw new Error(`Delete failed: ${await deleteRes.text()}`);
    }
    console.log('Deleted challenge.');

    // Verify score is updated
    const afterDeleteRes = await fetch(`${BASE_URL}/coding-challenges/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const afterDeleteData = await afterDeleteRes.json() as any;
    const afterDeleteScore = afterDeleteData.scores.find((s: any) => s.academicYear === 3);
    if (afterDeleteScore && afterDeleteScore.score > 0) {
      throw new Error(`Score not recalculated to 0 after deletion. Score: ${afterDeleteScore.score}`);
    }
    console.log('✅ Verified: Score successfully recalculated to 0 after deleting the challenge.');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The Coding Challenge Management Module complies with all required specifications.');

  } catch (err: any) {
    console.error(`\n❌ Tests Failed: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed.');
  }
}

runTest();
