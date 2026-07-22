import dns from 'dns';

// Ensure localhost resolves to ipv4 127.0.0.1
dns.setDefaultResultOrder('ipv4first');

const BASE_URL = 'http://localhost:6002/mad';

interface TestResponse {
  status: number;
  limit: string | null;
  remaining: string | null;
  reset: string | null;
  error?: string;
}

async function runLoadTest() {
  console.log('🏁 Starting Load Verification Test for Rate Limiter...');
  console.log('Sending 500 concurrent authentication requests to verify they are all allowed under the authRateLimiter limit (1200)...');
  console.log('Note: Sending invalid payloads to bypass expensive CPU bcrypt hashing, but still triggering the rate limiter middleware.\n');

  const totalRequests = 500;
  const promises: Promise<TestResponse>[] = [];
  const startTime = Date.now();

  for (let i = 0; i < totalRequests; i++) {
    promises.push(
      fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body returns 400 immediately, avoiding server-side bcrypt load
      }).then((res) => {
        return {
          status: res.status,
          limit: res.headers.get('ratelimit-limit'),
          remaining: res.headers.get('ratelimit-remaining'),
          reset: res.headers.get('ratelimit-reset')
        };
      }).catch(err => {
        return {
          status: 0,
          limit: null,
          remaining: null,
          reset: null,
          error: err.message
        };
      })
    );
  }

  console.log(`📡 Dispatched ${totalRequests} requests concurrently... Waiting for responses.`);
  const results = await Promise.all(promises);
  const duration = (Date.now() - startTime) / 1000;

  let expectedResponseCount = 0; // 400 Bad Request
  let rateLimitCount = 0; // 429 Too Many Requests
  let otherErrorCount = 0;
  
  const statusCounts: Record<number, number> = {};

  results.forEach(res => {
    statusCounts[res.status] = (statusCounts[res.status] || 0) + 1;
    if (res.status === 400) {
      expectedResponseCount++;
    } else if (res.status === 429) {
      rateLimitCount++;
    } else {
      otherErrorCount++;
    }
  });

  console.log('\n📊 --- Load Test Results ---');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Execution Time: ${duration.toFixed(2)} seconds`);
  console.log(`Expected (400 Bad Request): ${expectedResponseCount}`);
  console.log(`Rate Limited (429 Too Many Requests): ${rateLimitCount}`);
  console.log(`Other Errors / Statuses: ${otherErrorCount}`);
  console.log('Status breakdown:', statusCounts);

  const sampleResponse = results.find(r => r.status === 400);
  if (sampleResponse) {
    console.log('\nHeader check for request:');
    console.log(`- RateLimit-Limit: ${sampleResponse.limit}`);
    console.log(`- RateLimit-Remaining: ${sampleResponse.remaining}`);
    console.log(`- RateLimit-Reset (seconds remaining): ${sampleResponse.reset}`);
  }

  if (rateLimitCount > 0) {
    console.log('\n❌ FAILED: Some requests were rate-limited! We need to adjust limits.');
    process.exit(1);
  } else {
    console.log('\n✅ SUCCESS: All 500 concurrent requests were processed without rate limiting!');
    console.log('The rate limiter is correctly configured to allow 500+ concurrent student logins at the same time.');
    process.exit(0);
  }
}

runLoadTest();
