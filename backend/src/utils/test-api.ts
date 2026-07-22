import dns from 'dns';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://localhost:6002/mad';

async function runTests() {
  console.log('🏁 Starting VFSTR AEPS SYSTEM Integration API Verification Tests...\n');

  try {
    // 1. Test Login as Student
    console.log('🧪 Test 1: Authenticating as Student (Rahul)...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '231fa04864@gmail.com',
        password: '231fa04864'
      })
    });

    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(`Login failed: ${JSON.stringify(err)}`);
    }

    const loginData = await loginRes.json() as any;
    const token = loginData.accessToken;
    console.log('✅ Authentication Successful! Attaching Bearer JWT.\n');

    // 2. Fetch Student Profile
    console.log('🧪 Test 2: Querying Student Profile Details...');
    const profileRes = await fetch(`${BASE_URL}/students/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!profileRes.ok) {
      const errBody = await profileRes.text();
      throw new Error(`Failed to fetch student profile: ${profileRes.statusText} - ${errBody}`);
    }

    const profileData = await profileRes.json() as any;
    console.log(`✅ Success! Retrieved student details for Roll: ${profileData.student.rollNumber}, Branch: ${profileData.student.branch}\n`);

    // 3. Fetch Notifications
    console.log('🧪 Test 3: Querying Student In-App Alerts...');
    const alertRes = await fetch(`${BASE_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!alertRes.ok) {
      throw new Error(`Failed to query alerts: ${alertRes.statusText}`);
    }

    const alertData = await alertRes.json() as any;
    console.log(`✅ Success! Received ${alertData.notifications?.length || 0} active notifications.\n`);

    // 4. Test RBAC Protection - Faculty Endpoint with Student Token
    console.log('🧪 Test 4: Verifying Role Based Access Control Guard...');
    const forbiddenRes = await fetch(`${BASE_URL}/analytics/faculty/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (forbiddenRes.status === 403) {
      console.log('✅ Guard block succeeded! Student was correctly forbidden from Faculty Dashboard (403 Forbidden).\n');
    } else {
      throw new Error(`RBAC guard failed! Student was allowed access to Faculty dashboard with status: ${forbiddenRes.status}`);
    }

    console.log('🎉 All Integration Tests Passed Successfully! System compilation and network endpoints verified.');
  } catch (error: any) {
    console.error(`❌ Test Suite Failed: ${error.message}`);
    console.error('Make sure the server is running locally (npm run dev) and the database is seeded.');
    process.exit(1);
  }
}

runTests();
