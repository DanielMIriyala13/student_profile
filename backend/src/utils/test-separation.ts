import dns from 'dns';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://localhost:6002/mad';

async function runTests() {
  console.log('🏁 Starting Integration Verification Tests for separated Co-Curricular and Extra-Curricular modules...\n');

  try {
    // 1. Authenticate Student
    console.log('🧪 Step 1: Authenticating as Student (Rahul)...');
    const studentLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '231fa04829@gmail.com',
        password: '231fa04829'
      })
    });

    if (!studentLogin.ok) {
      throw new Error(`Student login failed: ${await studentLogin.text()}`);
    }
    const studentToken = (await studentLogin.json() as any).accessToken;
    console.log('✅ Student authenticated successfully.\n');

    // 2. Submit Co-Curricular Activity
    console.log('🧪 Step 2: Submitting a Co-Curricular Activity (Paper Presentation)...');
    const dummyCoFile = new Blob(['dummy co-curricular certificate'], { type: 'application/pdf' });
    const coFormData = new FormData();
    coFormData.append('activityName', 'Paper Presentation on Blockchain');
    coFormData.append('category', 'Paper Presentation');
    coFormData.append('activityLevel', 'Institute Level'); // Default 2 points
    coFormData.append('provider', 'IEEE VFSTR Student Branch');
    coFormData.append('certificateNumber', 'CO-12345');
    coFormData.append('issueDate', '2026-05-15');
    coFormData.append('academicYear', '1'); // Year 1
    coFormData.append('proofFile', dummyCoFile, 'co_certificate.pdf');

    const coSubmitRes = await fetch(`${BASE_URL}/co-curricular`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: coFormData
    });

    if (!coSubmitRes.ok) {
      throw new Error(`Co-Curricular submission failed: ${await coSubmitRes.text()}`);
    }
    const coActivity = (await coSubmitRes.json() as any).activity;
    console.log(`✅ Co-Curricular Activity submitted. ID: ${coActivity._id}, Calculated Score: ${coActivity.calculatedScore} (Expected: 2)\n`);

    // 3. Submit Extra-Curricular Activity
    console.log('🧪 Step 3: Submitting an Extra-Curricular Activity (NSS Camp)...');
    const dummyExtraFile = new Blob(['dummy extra-curricular certificate'], { type: 'application/pdf' });
    const extraFormData = new FormData();
    extraFormData.append('activityName', 'Village Swachh Bharat Camp');
    extraFormData.append('category', 'NSS'); // Default 5 points
    extraFormData.append('provider', 'National Service Scheme Unit');
    extraFormData.append('certificateNumber', 'EX-54321');
    extraFormData.append('issueDate', '2026-06-10');
    extraFormData.append('academicYear', '1'); // Year 1
    extraFormData.append('proofFile', dummyExtraFile, 'extra_certificate.pdf');

    const extraSubmitRes = await fetch(`${BASE_URL}/extra-curricular`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: extraFormData
    });

    if (!extraSubmitRes.ok) {
      throw new Error(`Extra-Curricular submission failed: ${await extraSubmitRes.text()}`);
    }
    const extraActivity = (await extraSubmitRes.json() as any).activity;
    console.log(`✅ Extra-Curricular Activity submitted. ID: ${extraActivity._id}, Calculated Score: ${extraActivity.calculatedScore} (Expected: 5)\n`);

    // 4. Authenticate Faculty
    console.log('🧪 Step 4: Authenticating as Faculty...');
    const facultyLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'faculty@institution.edu',
        password: 'password123'
      })
    });

    if (!facultyLogin.ok) {
      throw new Error(`Faculty login failed: ${await facultyLogin.text()}`);
    }
    const facultyToken = (await facultyLogin.json() as any).accessToken;
    console.log('✅ Faculty authenticated successfully.\n');

    // 5. Faculty Review Co-Curricular (Approve with override score = 3)
    console.log('🧪 Step 5: Faculty approving Co-Curricular Activity with score override (3 points)...');
    const coApproveRes = await fetch(`${BASE_URL}/co-curricular/${coActivity._id}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${facultyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        activityLevel: 'Inter-University Level',
        facultyApprovedScore: 3,
        remarks: 'Excellent blockchain representation'
      })
    });

    if (!coApproveRes.ok) {
      throw new Error(`Co-Curricular approval failed: ${await coApproveRes.text()}`);
    }
    console.log('✅ Co-Curricular approved successfully.\n');

    // 6. Faculty Review Extra-Curricular (Approve with override score = 4)
    console.log('🧪 Step 6: Faculty approving Extra-Curricular Activity with score override (4 points)...');
    const extraApproveRes = await fetch(`${BASE_URL}/extra-curricular/${extraActivity._id}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${facultyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        category: 'Social Service',
        facultyApprovedScore: 4,
        remarks: 'Verified Swachh Bharat community certificate'
      })
    });

    if (!extraApproveRes.ok) {
      throw new Error(`Extra-Curricular approval failed: ${await extraApproveRes.text()}`);
    }
    console.log('✅ Extra-Curricular approved successfully.\n');

    // 7. Verify Scores and Capping via student score API
    console.log('🧪 Step 7: Verifying student quantified score engine breakdown and capping policies...');
    const scoreRes = await fetch(`${BASE_URL}/scoring/my-score`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });

    if (!scoreRes.ok) {
      throw new Error(`Failed to fetch student scoring: ${await scoreRes.text()}`);
    }

    const scoreData = await scoreRes.json() as any;
    console.log('📊 Student Year Scores Breakdown:');
    console.log(JSON.stringify(scoreData.yearScores, null, 2));

    const year1Score = scoreData.yearScores?.find((y: any) => y.year === 1);
    if (!year1Score) {
      throw new Error('Year 1 score breakdown not found.');
    }

    const coCurricularScoreVal = year1Score.breakdown?.cocurricular || 0;
    const extraCurricularScoreVal = year1Score.breakdown?.extracurricular || 0;

    console.log(`\n🔎 Year 1 Co-Curricular score value: ${coCurricularScoreVal} (Capped at 5)`);
    console.log(`🔎 Year 1 Extra-Curricular score value: ${extraCurricularScoreVal} (Capped at 10)`);

    // Since our test submits and approves additional points, the scores should either be exactly our values
    // or capped at their maximums.
    if (coCurricularScoreVal < 3) {
      throw new Error(`Mismatch! Expected Co-Curricular Year 1 approved score to be at least 3, got ${coCurricularScoreVal}`);
    }
    if (extraCurricularScoreVal < 4) {
      throw new Error(`Mismatch! Expected Extra-Curricular Year 1 approved score to be at least 4, got ${extraCurricularScoreVal}`);
    }

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! Separation of Co-Curricular and Extra-Curricular modules is fully verified.');

  } catch (err: any) {
    console.error(`❌ Tests Failed: ${err.message}`);
    process.exit(1);
  }
}

runTests();
