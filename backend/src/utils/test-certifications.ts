import dns from 'dns';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '../../.env') });

import Student from '../models/Student';
import User from '../models/User';
import Certification from '../models/Certification';
import CertificationScore from '../models/CertificationScore';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://127.0.0.1:6002/mad';

async function runTest() {
  console.log('🏁 Starting Certification Management Integration Tests...');

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

    // Cleanup existing certifications for this student first to isolate tests
    await Certification.deleteMany({ studentId: sampleStudent._id } as any);
    await CertificationScore.deleteMany({ studentId: sampleStudent._id } as any);
    console.log('🧹 Cleaned existing certifications and scores for test user.');

    // 4. Student uploads certification
    console.log('\n🧪 Step 3: Student uploads a certificate...');
    const formData = new FormData();
    formData.append('certificateName', 'NPTEL Elite Java');
    formData.append('provider', 'NPTEL');
    formData.append('certificateCategory', 'NPTEL Elite'); // student selects Elite (3 pts)
    formData.append('academicYear', '3'); // Academic Year 3
    formData.append('completionDate', '2026-05-15');
    
    // Create a dummy text blob to act as file
    const fileBlob = new Blob(['dummy pdf certificate content'], { type: 'application/pdf' });
    formData.append('proofFile', fileBlob, 'proof.pdf');

    const uploadRes = await fetch(`${BASE_URL}/certifications`, {
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
    const certId = uploadData.certification._id;
    console.log(`✅ Upload Succeeded! Created Cert ID: ${certId} with Status: ${uploadData.certification.status}, Calculated Score: ${uploadData.certification.calculatedScore}`);

    if (uploadData.certification.calculatedScore !== 3) {
      throw new Error(`Expected calculatedScore to be 3, got: ${uploadData.certification.calculatedScore}`);
    }

    // Verify it appears in Student list with status PENDING
    const certsRes = await fetch(`${BASE_URL}/certifications/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const certsData = await certsRes.json() as any;
    const uploadedCert = certsData.certifications.find((c: any) => c._id === certId);
    if (!uploadedCert || uploadedCert.status !== 'PENDING') {
      throw new Error(`Certificate not found or status not PENDING. Data: ${JSON.stringify(certsData)}`);
    }
    console.log('✅ Verified: Certification is visible in Student profile with status PENDING.');

    // Verify score is not calculated yet
    let currentScore = certsData.scores.find((s: any) => s.academicYear === 3);
    if (currentScore && currentScore.score > 0) {
      throw new Error('Scoring engine pre-calculated pending certification. Expected 0 points.');
    }
    console.log('✅ Verified: Certification score is 0 before faculty approval.');

    // 5. Faculty views pending certifications
    console.log('\n🧪 Step 4: Faculty retrieves pending certification requests...');
    const pendingRes = await fetch(`${BASE_URL}/certifications/pending`, {
      headers: { 'Authorization': `Bearer ${facultyToken}` }
    });
    if (!pendingRes.ok) {
      throw new Error(`Pending fetch failed: ${await pendingRes.text()}`);
    }
    const pendingData = await pendingRes.json() as any;
    const certInQueue = pendingData.certifications.find((c: any) => c._id === certId);
    if (!certInQueue) {
      throw new Error('Uploaded certificate not visible in faculty pending queue.');
    }
    console.log(`✅ Verified: Certificate is visible in Faculty pending list. Student Selected Category: ${certInQueue.studentSelectedCategory}`);

    // 6. Faculty approves, overriding category to NPTEL Silver (worth 5 pts) and overrides score to 6 (direct score edit!)
    console.log('\n🧪 Step 5: Faculty approves certificate, overrides category to NPTEL Silver (5 pts) and directly overrides score to 6...');
    const approveRes = await fetch(`${BASE_URL}/certifications/${certId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        certificateCategory: 'NPTEL Silver',
        facultyApprovedScore: 6 // direct score edit!
      })
    });
    if (!approveRes.ok) {
      throw new Error(`Approval failed: ${await approveRes.text()}`);
    }
    const approveData = await approveRes.json() as any;
    console.log(`✅ Approved! Status: ${approveData.certification.status}, Approved Category: ${approveData.certification.facultyApprovedCategory}, Approved Score: ${approveData.certification.facultyApprovedScore}`);

    if (approveData.certification.facultyApprovedCategory !== 'NPTEL Silver' || approveData.certification.facultyApprovedScore !== 6) {
      throw new Error('Faculty category or score overrides were not saved correctly.');
    }

    // Verify that the score database was updated
    const finalCertsRes = await fetch(`${BASE_URL}/certifications/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const finalCertsData = await finalCertsRes.json() as any;
    const finalScore = finalCertsData.scores.find((s: any) => s.academicYear === 3);
    if (!finalScore || finalScore.score !== 6 || finalScore.totalPoints !== 6) {
      throw new Error(`Certification score not updated or incorrect. Expected 6, got: ${JSON.stringify(finalScore)}`);
    }
    console.log(`✅ Verified: Capped score is ${finalScore.score} (Total Points: ${finalScore.totalPoints}).`);

    // 7. Test capping rule (max cap is 10 for Year 3). Let's upload a Global Certification (worth 10 pts) for Year 3
    console.log('\n🧪 Step 6: Testing Year-Wise Scoring Cap...');
    console.log('Uploading second certification: Global Certification (10 pts) for Year 3...');
    const formData2 = new FormData();
    formData2.append('certificateName', 'AWS Certified Solution Architect');
    formData2.append('provider', 'Amazon');
    formData2.append('certificateCategory', 'Global Certification');
    formData2.append('academicYear', '3');
    formData2.append('completionDate', '2026-06-01');
    formData2.append('proofFile', fileBlob, 'proof2.pdf');

    const uploadRes2 = await fetch(`${BASE_URL}/certifications`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: formData2
    });
    const uploadData2 = await uploadRes2.json() as any;
    const certId2 = uploadData2.certification._id;
    console.log(`Uploaded second certificate: ${certId2}`);

    // Approve the second certificate
    console.log('Faculty approves second certificate...');
    await fetch(`${BASE_URL}/certifications/${certId2}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      }
    });

    // Check scores. Since we approved first (6 pts) and second (10 pts), total points = 16.
    // However, Year 3 maximum score is capped at 10. So score must be 10!
    const cappedScoreRes = await fetch(`${BASE_URL}/certifications/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const cappedScoreData = await cappedScoreRes.json() as any;
    const cappedScore = cappedScoreData.scores.find((s: any) => s.academicYear === 3);
    
    if (!cappedScore || cappedScore.score !== 10 || cappedScore.totalPoints !== 16) {
      throw new Error(`Capping failed. Expected score 10 and total points 16. Got: ${JSON.stringify(cappedScore)}`);
    }
    console.log(`✅ Capping Rule Succeeded! Total Points = ${cappedScore.totalPoints}, Final Score = ${cappedScore.score} (Capped at 10)`);

    // Verify all certifications are still visible
    const visibleCertsCount = cappedScoreData.certifications.length;
    if (visibleCertsCount !== 2) {
      throw new Error(`Visible certifications count mismatch. Expected 2, got: ${visibleCertsCount}`);
    }
    console.log(`✅ Verified: All ${visibleCertsCount} certificates remain visible regardless of score cap.`);

    // 8. Rejection Rule: Faculty rejects certificate
    console.log('\n🧪 Step 7: Testing Rejection with mandatory feedback...');
    const rejectRes = await fetch(`${BASE_URL}/certifications/${certId2}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      },
      body: JSON.stringify({
        remarks: 'Document is blur and unreadable.' // feedback provided as remarks
      })
    });
    if (!rejectRes.ok) {
      throw new Error(`Rejection failed: ${await rejectRes.text()}`);
    }
    const rejectData = await rejectRes.json() as any;
    console.log(`✅ Rejected! Status: ${rejectData.certification.status}, Rejection Feedback/Remarks: ${rejectData.certification.remarks}`);

    // Verify score is recalculated. Rejected certificate does not contribute, so Year 3 score should revert to 6 (from first certificate).
    const afterRejectRes = await fetch(`${BASE_URL}/certifications/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const afterRejectData = await afterRejectRes.json() as any;
    const afterRejectScore = afterRejectData.scores.find((s: any) => s.academicYear === 3);
    if (!afterRejectScore || afterRejectScore.score !== 6 || afterRejectScore.totalPoints !== 6) {
      throw new Error(`Score recalculation after rejection failed. Expected 6, got: ${JSON.stringify(afterRejectScore)}`);
    }
    console.log(`✅ Verified: Certification score correctly recalculated to ${afterRejectScore.score} after rejection.`);

    // Verify rejected certification remains visible in student profile
    const rejectedCert = afterRejectData.certifications.find((c: any) => c._id === certId2);
    if (!rejectedCert || rejectedCert.status !== 'REJECTED' || rejectedCert.remarks !== 'Document is blur and unreadable.') {
      throw new Error(`Rejected certificate not visible or remarks missing. Got: ${JSON.stringify(rejectedCert)}`);
    }
    console.log('✅ Verified: Rejected certificate remains visible with feedback.');

    // 9. Edit Rule: If student edits certificate, status becomes PENDING
    console.log('\n🧪 Step 8: Testing Edit Rule...');
    const editFormData = new FormData();
    editFormData.append('certificateName', 'NPTEL Elite Python (Edited)');
    editFormData.append('provider', 'NPTEL');
    editFormData.append('certificateCategory', 'NPTEL Elite');
    editFormData.append('academicYear', '3');
    
    const editRes = await fetch(`${BASE_URL}/certifications/${certId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: editFormData
    });
    if (!editRes.ok) {
      throw new Error(`Edit failed: ${await editRes.text()}`);
    }
    const editData = await editRes.json() as any;
    console.log(`✅ Edit Succeeded! Certificate status: ${editData.certification.status}`);
    
    // Verify score becomes 0 again since the edit reverted it to PENDING
    const afterEditRes = await fetch(`${BASE_URL}/certifications/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const afterEditData = await afterEditRes.json() as any;
    const afterEditScore = afterEditData.scores.find((s: any) => s.academicYear === 3);
    if (afterEditScore && afterEditScore.score > 0) {
      throw new Error(`Score not recalculated to 0 after revert to PENDING. Score: ${afterEditScore.score}`);
    }
    console.log('✅ Verified: Score reverted to 0 after editing (since status became PENDING).');

    // 10. Delete Rule: If approved certificate is deleted, immediately recalculate
    console.log('\n🧪 Step 9: Testing Delete Rule...');
    // Approve it again first
    await fetch(`${BASE_URL}/certifications/${certId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${facultyToken}`
      }
    });
    console.log('Approved certificate again.');

    // Delete it
    const deleteRes = await fetch(`${BASE_URL}/certifications/${certId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    if (!deleteRes.ok) {
      throw new Error(`Delete failed: ${await deleteRes.text()}`);
    }
    console.log('Deleted certificate.');

    // Verify score is updated
    const afterDeleteRes = await fetch(`${BASE_URL}/certifications/student`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const afterDeleteData = await afterDeleteRes.json() as any;
    const afterDeleteScore = afterDeleteData.scores.find((s: any) => s.academicYear === 3);
    if (afterDeleteScore && afterDeleteScore.score > 0) {
      throw new Error(`Score not recalculated to 0 after deletion. Score: ${afterDeleteScore.score}`);
    }
    console.log('✅ Verified: Score successfully recalculated to 0 after deleting the certificate.');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! The Certification Management Module complies with all required specifications.');

  } catch (err: any) {
    console.error(`\n❌ Tests Failed: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed.');
  }
}

runTest();
