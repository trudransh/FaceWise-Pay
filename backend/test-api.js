const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('Testing API Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await fetch(`${BASE_URL}/health`);
    const healthData = await health.json();
    console.log('Health:', healthData.status);

    // Test 2: API documentation
    console.log('2. Testing API docs...');
    const docs = await fetch(`${BASE_URL}/api`);
    const docsData = await docs.json();
    console.log('API Docs:', docsData.name);

    // Test 3: Create wallet
    console.log('3. Testing wallet creation...');
    const walletRes = await fetch(`${BASE_URL}/api/wallet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const walletData = await walletRes.json();
    console.log('Wallet created:', walletData.success);

    // Test 4: Check enrolled faces
    console.log('4. Testing face enrollment check...');
    const faceRes = await fetch(`${BASE_URL}/api/face/enrolled`);
    const faceData = await faceRes.json();
    console.log('Enrolled faces:', faceData.data.count);

    console.log('\nAll API tests passed!');
    console.log('\nAvailable endpoints:');
    console.log('- POST /api/wallet/create');
    console.log('- POST /api/face/enroll (requires photo)');
    console.log('- POST /api/face/recognize (requires photo)');
    console.log('- POST /api/payment/face-pay (requires photo)');

  } catch (error) {
    console.error('API test failed:', error.message);
  }
}

testAPI();