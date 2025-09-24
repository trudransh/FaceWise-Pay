const fetch = global.fetch || ((...args) => import('node-fetch').then(({ default: f }) => f(...args)));
// Module-level state
let _aptos = null;
let _adminAccount = null;
let _packageAddress = process.env.APTOS_PACKAGE_ADDRESS || null;
let _network = process.env.APTOS_NETWORK || 'devnet';

async function getSdk() {
  try {
    const sdk = await import('@aptos-labs/ts-sdk');
    return sdk;
  } catch (error) {
    throw new Error(`Failed to load Aptos SDK: ${error.message}`);
  }
}

async function getClient() {
  if (_aptos) return _aptos;
  
  const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = await getSdk();
  const config = new AptosConfig({ 
    network: _network === 'devnet' ? Network.DEVNET : Network.TESTNET
  });
  _aptos = new Aptos(config);

  if (process.env.APTOS_PRIVATE_KEY && !_adminAccount) {
    const pk = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY);
    _adminAccount = Account.fromPrivateKey({ privateKey: pk });
    console.log('✅ Aptos admin account initialized');
  }
  
  return _aptos;
}

async function createWallet() {
  const { Account } = await getSdk();
  const account = Account.generate();
  
  return {
    address: account.accountAddress.toString(),
    privateKey: account.privateKey.toString(),
    publicKey: account.publicKey.toString(),
  };
}

async function getBalance(address) {
  const aptos = await getClient();
  try {
    const resources = await aptos.getAccountResources({ accountAddress: address });
    
    // Get APT balance
    const aptStore = resources.find(r => 
      r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
    );
    const aptBalance = aptStore ? aptStore.data.coin.value : '0';
    
    // Get FWSE token balance if exists
    let fwseBalance = '0';
    try {
      const fwseStore = resources.find(r => 
        r.type.includes('facewise_pay') && r.type.includes('FWSE')
      );
      fwseBalance = fwseStore ? fwseStore.data.coin.value : '0';
    } catch (e) {
      // FWSE not initialized yet
    }
    
    return {
      apt: {
        balance: aptBalance,
        formatted: (Number(aptBalance) / 1e8).toFixed(8)
      },
      fwse: {
        balance: fwseBalance,
        formatted: (Number(fwseBalance) / 1e8).toFixed(8)
      }
    };
  } catch (error) {
    throw new Error(`Balance check failed: ${error.message}`);
  }
}

async function deriveAddressFromPrivateKey(privateKeyHex) {
  const { Account, Ed25519PrivateKey } = await getSdk();
  const pk = new Ed25519PrivateKey(privateKeyHex);
  const acc = Account.fromPrivateKey({ privateKey: pk });
  return acc.accountAddress.toString();
}

async function transferAPT(fromPrivateKey, toAddress, amount) {
  const aptos = await getClient();
  const { Account, Ed25519PrivateKey } = await getSdk();
  
  try {
    const octas = Math.floor(Number(amount) * 1e8);
    if (!Number.isFinite(octas) || octas <= 0) {
      throw new Error('Invalid amount');
    }

    const pk = new Ed25519PrivateKey(fromPrivateKey);
    const sender = Account.fromPrivateKey({ privateKey: pk });

    const transaction = await aptos.transaction.build.simple({
      sender: sender.accountAddress,
      data: {
        function: '0x1::aptos_account::transfer',
        functionArguments: [toAddress, octas]
      }
    });

    const committed = await aptos.signAndSubmitTransaction({ 
      signer: sender, 
      transaction 
    });
    
    const result = await aptos.waitForTransaction({ 
      transactionHash: committed.hash 
    });

    console.log('✅ APT transfer completed:', result.hash);
    
    return {
      hash: result.hash,
      status: result.success ? 'success' : 'failed',
      gasUsed: result.gas_used,
      version: result.version
    };
  } catch (error) {
    console.error('APT transfer error:', error);
    throw new Error(`APT transfer failed: ${error.message}`);
  }
}

async function mintRewards(toAddress, amount) {
  if (!_packageAddress) {
    throw new Error('APTOS_PACKAGE_ADDRESS not configured');
  }
  if (!_adminAccount) {
    throw new Error('Admin account not configured - check APTOS_PRIVATE_KEY');
  }
  
  const aptos = await getClient();
  
  try {
    const qty = Math.floor(Number(amount) * 1e8);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('Invalid amount');
    }

    const transaction = await aptos.transaction.build.simple({
      sender: _adminAccount.accountAddress,
      data: {
        function: `${_packageAddress}::facewise_pay::mint_rewards`,
        functionArguments: [toAddress, qty]
      }
    });

    const committed = await aptos.signAndSubmitTransaction({ 
      signer: _adminAccount, 
      transaction 
    });
    
    const result = await aptos.waitForTransaction({ 
      transactionHash: committed.hash 
    });

    console.log('✅ FWSE rewards minted:', result.hash);
    
    return {
      hash: result.hash,
      status: result.success ? 'success' : 'failed',
      gasUsed: result.gas_used,
      amount,
      recipient: toAddress
    };
  } catch (error) {
    console.error('Mint rewards error:', error);
    throw new Error(`Mint rewards failed: ${error.message}`);
  }
}

// Alias for wallet route compatibility
async function mintTokens(toAddress, amount) {
  return mintRewards(toAddress, amount);
}

// Process payment: transfer APT + mint rewards
async function processPayment(fromPrivateKey, merchantAddress, amount) {
  try {
    console.log(`💳 Processing payment: ${amount} APT`);
    
    // 1. Transfer APT to merchant
    const payment = await transferAPT(fromPrivateKey, merchantAddress, amount);
    
    // 2. Mint FWSE rewards to customer
    const customerAddress = await deriveAddressFromPrivateKey(fromPrivateKey);
    const rewards = await mintRewards(customerAddress, amount);
    
    return {
      paymentHash: payment.hash,
      rewardHash: rewards.hash,
      rewardAmount: amount
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}

async function getTransaction(hash) {
  const aptos = await getClient();
  try {
    return await aptos.getTransactionByHash({ transactionHash: hash });
  } catch (error) {
    throw new Error(`Failed to get transaction: ${error.message}`);
  }
}


function getStatus() {
  return {
    network: _network,
    packageAddress: _packageAddress,
    adminConfigured: Boolean(_adminAccount),
    rpcConnected: Boolean(_aptos)
  };
}

module.exports = {
  createWallet,
  getBalance,
  transferAPT,
  mintRewards,
  mintTokens,
  processPayment,
  getTransaction,
  getStatus,
  deriveAddressFromPrivateKey
};