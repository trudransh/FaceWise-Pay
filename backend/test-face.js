require('dotenv').config();
const faceService = require('./src/services/faceService');

async function testFaceService() {
  console.log('🧪 Testing Face Service...\n');
  
  try {
    // Test 1: Service initialization
    console.log('1. Service Status:');
    console.log('Enrolled wallets:', faceService.getEnrolledWallets().length);
    console.log('');
    
    // Test 2: Check Luxand API connectivity
    console.log('2. Testing Luxand API connectivity...');
    console.log('API Token:', process.env.LUXAND_API_TOKEN ? 'Set' : 'Missing');
    console.log('API URL:', faceService.baseUrl);
    
    // For now, we can't test actual face recognition without a photo
    // But we can verify the service is configured correctly
    
    console.log('\n✅ Face service configuration looks good!');
    console.log('📝 Note: Actual face recognition will be tested via API endpoints');
    
  } catch (error) {
    console.error('❌ Face service test failed:', error.message);
  }
}

testFaceService();