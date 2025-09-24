require('dotenv').config();
const aptosService = require('./src/services/aptosService');

async function testAptos() {
  console.log('🧪 Testing Aptos Service...\n');
  
  try {
    // Test 1: Service Status
    console.log('1. Service Status:');
    const status = aptosService.getStatus();
    console.log('✅ Status:', status);
    console.log('');
    
    // Test 2: Create test wallet
    console.log('2. Creating test wallet...');
    const wallet = await aptosService.createWallet();
    console.log('✅ Wallet created:');
    console.log('   Address:', wallet.address);
    console.log('   Private Key:', wallet.privateKey.substring(0, 20) + '...');
    console.log('');
    
    // Test 3: Check admin balance (if configured)
    console.log('3. Checking admin configuration...');
    if (process.env.APTOS_PRIVATE_KEY) {
      try {
        const adminAddress = await aptosService.deriveAddressFromPrivateKey(process.env.APTOS_PRIVATE_KEY);
        console.log('✅ Admin address:', adminAddress);
        
        const adminBalance = await aptosService.getBalance(adminAddress);
        console.log('✅ Admin balance:', adminBalance);
      } catch (error) {
        console.log('⚠️  Admin balance check failed:', error.message);
      }
    } else {
      console.log('⚠️  APTOS_PRIVATE_KEY not set - admin functions disabled');
    }
    console.log('');
    
    // Test 4: Check new wallet balance
    console.log('4. Checking new wallet balance...');
    try {
      const newBalance = await aptosService.getBalance(wallet.address);
      console.log('✅ New wallet balance:', newBalance);
    } catch (error) {
      console.log('⚠️  Balance check failed (expected for new wallet):', error.message);
    }
    console.log('');
    
    // Test 5: Test address derivation
    console.log('5. Testing address derivation...');
    const derivedAddress = await aptosService.deriveAddressFromPrivateKey(wallet.privateKey);
    const addressMatch = derivedAddress === wallet.address;
    console.log('✅ Address derivation:', addressMatch ? 'PASS' : 'FAIL');
    console.log('   Original:', wallet.address);
    console.log('   Derived: ', derivedAddress);
    console.log('');
    
    console.log('🎉 Aptos service tests completed!\n');
    
    console.log('📋 Next steps:');
    console.log('   1. Set APTOS_PRIVATE_KEY for admin functions');
    console.log('   2. Set APTOS_PACKAGE_ADDRESS for token operations');
    console.log('   3. Fund admin account with APT for gas fees');
    console.log('   4. Deploy smart contracts if not already done');
    
  } catch (error) {
    console.error('❌ Aptos test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAptos();