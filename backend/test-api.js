const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing FaceWise-Pay API Endpoints...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const health = await fetch(`${BASE_URL}/health`);
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`);
    const healthData = await health.json();
    console.log('✅ Health:', healthData.status);
    console.log('   Aptos Status:', healthData.aptos);
    console.log('');

    // Test 2: API documentation
    console.log('2. Testing API docs...');
    const docs = await fetch(`${BASE_URL}/api`);
    if (!docs.ok) throw new Error(`API docs failed: ${docs.status}`);
    const docsData = await docs.json();
    console.log('✅ API Docs:', docsData.name);
    console.log('   Blockchain:', docsData.blockchain);
    console.log('');

    // Test 3: Create wallet
    console.log('3. Testing wallet creation...');
    const walletRes = await fetch(`${BASE_URL}/api/wallet/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!walletRes.ok) throw new Error(`Wallet creation failed: ${walletRes.status}`);
    const walletData = await walletRes.json();
    console.log('✅ Wallet created:', walletData.success);
    console.log('   Address:', walletData.data.address);
    console.log('');

    // Test 4: Check wallet balance
    console.log('4. Testing wallet balance...');
    const balanceRes = await fetch(`${BASE_URL}/api/wallet/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: walletData.data.address })
    });
    if (!balanceRes.ok) throw new Error(`Balance check failed: ${balanceRes.status}`);
    const balanceData = await balanceRes.json();
    console.log('✅ Balance check:', balanceData.success);
    console.log('   APT Balance:', balanceData.data.apt.formatted);
    console.log('');

    // Test 5: Check enrolled faces
    console.log('5. Testing face enrollment check...');
    const faceRes = await fetch(`${BASE_URL}/api/face/enrolled`);
    if (!faceRes.ok) throw new Error(`Face enrollment check failed: ${faceRes.status}`);
    const faceData = await faceRes.json();
    console.log('✅ Enrolled faces:', faceData.data.count);
    console.log('');

    // Test 6: Wallet service status
    console.log('6. Testing wallet service status...');
    const statusRes = await fetch(`${BASE_URL}/api/wallet/status`);
    if (!statusRes.ok) throw new Error(`Status check failed: ${statusRes.status}`);
    const statusData = await statusRes.json();
    console.log('✅ Wallet service status:', statusData.success);
    console.log('   Network:', statusData.data.network);
    console.log('   Admin configured:', statusData.data.adminConfigured);
    console.log('');

    console.log('🎉 All API tests passed!\n');
    console.log('📋 Available endpoints:');
    console.log('   - POST /api/wallet/create');
    console.log('   - POST /api/wallet/balance');
    console.log('   - POST /api/wallet/mint (admin only)');
    console.log('   - POST /api/face/enroll (requires photo)');
    console.log('   - POST /api/face/recognize (requires photo)');
    console.log('   - POST /api/payment/face-pay (requires photo + private key)');
    console.log('   - POST /api/payment/simulate');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testAPI();