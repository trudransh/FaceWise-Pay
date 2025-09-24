require('dotenv').config();
const aptosService = require('./src/services/aptosService');

async function testAptos() {
  console.log('🧪 Testing Aptos Service...\n');
  
  try {
    console.log('1. Service Status:');
    console.log(aptosService.getStatus());
    console.log('');
    
    console.log('2. Creating test wallet...');
    const wallet = aptosService.createWallet();
    console.log('Wallet created:', wallet.address);
    console.log('');
    
    console.log('3. Checking admin balance...');
    const adminAddress = aptosService.adminAccount?.accountAddress.toString();
    if (adminAddress) {
      const balance = await aptosService.getBalance(adminAddress);
      console.log('Admin balance:', balance);
    } else {
      console.log('❌ Admin account not initialized');
    }
    console.log('');
    
    console.log('4. Checking new wallet balance...');
    const newBalance = await aptosService.getBalance(wallet.address);
    console.log('New wallet balance:', newBalance);
    
    console.log('\n✅ Aptos service tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAptos();