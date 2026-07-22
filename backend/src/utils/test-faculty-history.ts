import dns from 'dns';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import Student from '../models/Student';
import User from '../models/User';
import Certification from '../models/Certification';
import CertificationScore from '../models/CertificationScore';
import AuditLog from '../models/AuditLog';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://127.0.0.1:6002/mad';

async function runTest() {
  console.log('🏁 Starting Faculty Approval History & Edit System Integration Tests...');

  // Connect to DB directly
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
  await mongoose.connect(MONGO_URI);
  console.log('📡 Connected directly to MongoDB.');

  try {
    // 1. Find a sample student
    const sampleStudent = await Student.findOne({});
    if (!sampleStudent) {
      throw new Error('No students found in the database. Run seed first.');
    }
    const studentUser = await User.findById(sampleStudent.userId);
    if (!studentUser) {
      throw new Error('Student user not found.');
    }

    const studentEmail = studentUser.email;
    console.log(`👤 Test Student: ${studentUser.name} (${sampleStudent.rollNumber})`);

    // 2. Auth as Student
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
    console.log('✅ Authenticated as Student.');

    // 3. Auth as Faculty
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
    console.log('✅ Authenticated as Faculty.');

    // 4. Cleanup existing certifications for the student
    await Certification.deleteMany({ studentId: sampleStudent._id } as any);
    await CertificationScore.deleteMany({ studentId: sampleStudent._id } as any);
    await AuditLog.deleteMany({ achievementId: { $exists: true } } as any);
    console.log('🧹 Cleaned existing records for test student.');

    // 5. Upload certification
    console.log('\n🧪 Test Step 1: Uploading a new certification...');
    const formData = new FormData();
    formData.append('certificateName', 'NPTEL Elite Java');
    formData.append('provider', 'NPTEL');
    formData.append('certificateCategory', 'NPTEL Elite');
    formData.append('academicYear', '3');
    formData.append('completionDate', '2026-05-15');
    
    const fileBlob = new Blob(['dummy certification proof'], { type: 'application/pdf' });
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
    console.log(`✅ Upload Succeeded! Cert ID: ${certId}`);

    // 6. Query pending achievements from new unified endpoint
    console.log('\n🧪 Test Step 2: Querying unified pending list...');
    const pendingRes = await fetch(`${BASE_URL}/faculty/achievements?status=PENDING&module=Certification`, {
      headers: { 'Authorization': `Bearer ${facultyToken}` }
    });
    if (!pendingRes.ok) {
      throw new Error(`Pending fetch failed: ${await pendingRes.text()}`);
    }
    const pendingData = await pendingRes.json() as any;
    const foundPending = pendingData.results.find((r: any) => r.id === certId);
    if (!foundPending) {
      throw new Error('Newly uploaded certification not found in unified pending achievements endpoint.');
    }
    console.log('✅ Found certification in unified pending list.');

    // 7. Approve certification
    console.log('\n🧪 Test Step 3: Faculty approves the certificate...');
    const approveRes = await fetch(`${BASE_URL}/certifications/${certId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${facultyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        remarks: 'Excellent work!',
        certificateCategory: 'NPTEL Elite',
        facultyApprovedScore: 3
      })
    });
    if (!approveRes.ok) {
      throw new Error(`Approval failed: ${await approveRes.text()}`);
    }
    console.log('✅ Approved certificate.');

    // Assert DB score updated
    const scoreDoc = await CertificationScore.findOne({ studentId: sampleStudent._id as any, academicYear: 3 });
    if (!scoreDoc || scoreDoc.score !== 3) {
      throw new Error(`Expected score 3 in DB, got: ${scoreDoc?.score}`);
    }
    console.log('✅ Database score matches approved value (3 points).');

    // 8. Edit approved achievement (change category to NPTEL Gold, score 5)
    console.log('\n🧪 Test Step 4: Faculty edits approved certificate (NPTEL Elite -> NPTEL Gold)...');
    const editRes = await fetch(`${BASE_URL}/faculty/achievements/Certification/${certId}/edit`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${facultyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'APPROVED',
        category: 'NPTEL Gold',
        score: 5,
        remarks: 'Corrected category to Gold'
      })
    });
    if (!editRes.ok) {
      throw new Error(`Edit failed: ${await editRes.text()}`);
    }
    console.log('✅ Edited certificate.');

    // Verify DB updated
    const updatedCert = await Certification.findById(certId);
    if (!updatedCert || updatedCert.certificateCategory !== 'NPTEL Gold' || updatedCert.facultyApprovedScore !== 5) {
      throw new Error('Edit failed to update Certification category/score.');
    }
    console.log('✅ Verification: Certification updated in DB successfully.');

    // Verify recalculated score
    const recalculatedScore = await CertificationScore.findOne({ studentId: sampleStudent._id as any, academicYear: 3 });
    if (!recalculatedScore || recalculatedScore.score !== 5) {
      throw new Error(`Expected recalculated score to be 5, got: ${recalculatedScore?.score}`);
    }
    console.log('✅ Verification: Score recalculated to 5 points successfully.');

    // Verify audit log exists
    const auditLogs = await AuditLog.find({ achievementId: certId });
    if (auditLogs.length !== 1) {
      throw new Error(`Expected exactly 1 audit log, got: ${auditLogs.length}`);
    }
    const log = auditLogs[0];
    if (log.previousStatus !== 'APPROVED' || log.newStatus !== 'APPROVED' || log.previousScore !== 3 || log.updatedScore !== 5) {
      throw new Error(`Audit log values mismatch: ${JSON.stringify(log)}`);
    }
    console.log('✅ Verification: Audit log contains precise change metadata.');

    // 9. Edit Approved -> Rejected
    console.log('\n🧪 Test Step 5: Faculty rejects the previously approved certificate...');
    const rejectEditRes = await fetch(`${BASE_URL}/faculty/achievements/Certification/${certId}/edit`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${facultyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'REJECTED',
        remarks: 'Invalid document upload proof'
      })
    });
    if (!rejectEditRes.ok) {
      throw new Error(`Rejection edit failed: ${await rejectEditRes.text()}`);
    }
    console.log('✅ Status changed to Rejected.');

    // Verify DB updated & score removed
    const rejectedCert = await Certification.findById(certId);
    if (!rejectedCert || rejectedCert.status !== 'REJECTED' || rejectedCert.facultyApprovedScore !== undefined) {
      throw new Error('Rejection did not clear approved score or status.');
    }
    console.log('✅ Verification: Status updated to REJECTED and score cleared.');

    // Verify recalculated score is 0
    const zeroScore = await CertificationScore.findOne({ studentId: sampleStudent._id as any, academicYear: 3 });
    if (!zeroScore || zeroScore.score !== 0) {
      throw new Error(`Expected score 0 after rejection, got: ${zeroScore?.score}`);
    }
    console.log('✅ Verification: Student score recalculated to 0 points.');

    // Verify audit logs timeline
    const allLogs = await AuditLog.find({ achievementId: certId }).sort({ createdAt: -1 });
    if (allLogs.length !== 2) {
      throw new Error(`Expected 2 audit logs, got: ${allLogs.length}`);
    }
    console.log(`✅ Verification: Audit timeline has ${allLogs.length} events logged.`);

    // 10. Fetch audit timeline via endpoint
    const auditRes = await fetch(`${BASE_URL}/faculty/achievements/Certification/${certId}/audit`, {
      headers: { 'Authorization': `Bearer ${facultyToken}` }
    });
    if (!auditRes.ok) {
      throw new Error(`Audit GET endpoint failed: ${await auditRes.text()}`);
    }
    const auditData = await auditRes.json() as any;
    if (auditData.history.length !== 2) {
      throw new Error('Audit history list size mismatch from endpoint.');
    }
    console.log('✅ Verification: Audit timeline successfully retrieved via endpoint.');

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! History & Edit workflows verified.');
  } catch (error: any) {
    console.error(`\n❌ Tests Failed: ${error.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTest();
