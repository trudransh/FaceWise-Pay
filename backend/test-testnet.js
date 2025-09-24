require('dotenv').config();
const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));
const aptosService = require('./src/services/aptosService');

const BASE_URL = 'http://localhost:3000';

async function testTestnetIntegration() {
  console.log('Testing FaceWise-Pay on Aptos Testnet...\n');
  
  try {
    // Test 1: Verify testnet configuration
    console.log('1. Verifying testnet configuration...');
    const status = aptosService.getStatus();
    console.log('Network:', status.network);
    console.log('Package Address:', status.packageAddress);
    console.log('Admin Configured:', status.adminConfigured);
    
    if (status.network !== 'testnet') {
      throw new Error('Not configured for testnet! Update APTOS_NETWORK=testnet');
    }
    console.log('');

    // Test 2: Create customer and merchant wallets
    console.log('2. Creating test wallets...');
    const customerRes = await fetch(`${BASE_URL}/api/wallet/create`, { method: 'POST' });
    const customerData = await customerRes.json();
    
    const merchantRes = await fetch(`${BASE_URL}/api/wallet/create`, { method: 'POST' });
    const merchantData = await merchantRes.json();
    
    console.log('Customer wallet:', customerData.data.address);
    console.log('Merchant wallet:', merchantData.data.address);
    console.log('');

    // // Test 3: Fund customer wallet from testnet faucet
    // console.log('3. Funding customer wallet from testnet faucet...');
    // const faucetRes = await fetch(`${BASE_URL}/api/wallet/faucet`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ address: customerData.data.address })
    // });
    
    // if (faucetRes.ok) {
    //   console.log('Faucet funding successful');
      
    //   // Wait for funding to process
    //   console.log('   Waiting 5 seconds for funding to process...');
    //   await new Promise(resolve => setTimeout(resolve, 5000));
    // } else {
    //   console.log(' Faucet funding failed - proceeding anyway');
    // }
    // console.log('');

    // Test 4: Check balances
    console.log('4. Checking wallet balances...');
    const balanceRes = await fetch(`${BASE_URL}/api/wallet/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: customerData.data.address })
    });
    
    const balanceData = await balanceRes.json();
    console.log('Customer balance:', balanceData.data.apt.formatted, 'APT');
    console.log('');

    // Test 5: Test real APT transfer on testnet
    console.log('5. Testing real APT transfer on testnet...');
    const transferAmount = 0.01; // 0.01 APT
    
    const paymentRes = await fetch(`${BASE_URL}/api/payment/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromPrivateKey: customerData.data.privateKey,
        merchantAddress: merchantData.data.address,
        amount: transferAmount
      })
    });
    
    if (paymentRes.ok) {
      const paymentData = await paymentRes.json();
      console.log('Real testnet transaction successful!');
      console.log('Payment Hash:', paymentData.data.payment.paymentHash);
      console.log('Reward Hash:', paymentData.data.payment.rewardHash);
      console.log('Explorer URL:', paymentData.data.payment.explorerUrl);
      console.log('');
      
      // Test 6: Verify transaction on explorer
      console.log('6. Transaction verification:');
      console.log('View on Testnet Explorer:');
      console.log(' ', paymentData.data.payment.explorerUrl);
      console.log('');
      
      // Test 7: Check updated balances
      console.log('7. Checking updated balances...');
      const newBalanceRes = await fetch(`${BASE_URL}/api/wallet/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: customerData.data.address })
      });
      
      const newBalanceData = await newBalanceRes.json();
      console.log('Customer APT balance:', newBalanceData.data.apt.formatted);
      console.log('Customer FWSE balance:', newBalanceData.data.fwse.formatted);
      
    } else {
      const errorData = await paymentRes.json();
      console.log('Payment failed:', errorData.message);
    }
    
    console.log('\n Testnet integration test completed!');
    console.log('\n Next steps:');
    console.log('   1. Check transactions on Aptos Testnet Explorer');
    console.log('   2. Test face enrollment/recognition via API');
    console.log('   3. Test full face-pay flow with photos');

  } catch (error) {
    console.error('Testnet test failed:', error.message);
    process.exit(1);
  }
}

testTestnetIntegration();