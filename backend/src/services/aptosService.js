const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require('@aptos-labs/ts-sdk');

const network =
  process.env.APTOS_NETWORK === 'mainnet' ? Network.MAINNET :
  process.env.APTOS_NETWORK === 'testnet' ? Network.TESTNET :
  Network.DEVNET;

const config = new AptosConfig({ network });
const client = new Aptos(config);

const packageAddress = process.env.APTOS_PACKAGE_ADDRESS;
let adminAccount;

if (process.env.APTOS_PRIVATE_KEY) {
  try {
    const privateKey = new Ed25519PrivateKey(process.env.APTOS_PRIVATE_KEY);
    adminAccount = Account.fromPrivateKey({ privateKey });
    console.log('Aptos admin initialized:', adminAccount.accountAddress.toString());
  } catch (error) {
    console.warn('Admin account failed:', error.message);
  }
}

function createWallet() {
  const account = Account.generate();
  return {
    address: account.accountAddress.toString(),
    privateKey: account.privateKey.toString(),
    publicKey: account.publicKey.toString()
  };
}

async function getBalance(address) {
  try {
    const aptBalance = await client.getAccountAPTAmount({ accountAddress: address });

    let fwseBalance = 0;
    try {
      const resources = await client.getAccountResources({ accountAddress: address });
      const tokenResource = resources.find(r =>
        r.type.includes('primary_fungible_store::PrimaryStore') && r.data?.balance
      );
      if (tokenResource) fwseBalance = parseInt(tokenResource.data.balance);
    } catch (e) {
      console.log('FWSE balance not found');
    }

    return {
      apt: { balance: aptBalance.toString(), formatted: (aptBalance / 1e8).toFixed(8) },
      fwse: { balance: fwseBalance.toString(), formatted: (fwseBalance / 1e8).toFixed(8) }
    };
  } catch (error) {
    throw new Error(`Balance check failed: ${error.message}`);
  }
}

async function mintTokens(recipientAddress, amount) {
  if (!adminAccount) throw new Error('Admin account not configured');
  if (!packageAddress) throw new Error('APTOS_PACKAGE_ADDRESS not configured');

  const transaction = await client.transaction.build.simple({
    sender: adminAccount.accountAddress,
    data: {
      function: `${packageAddress}::facewise_pay::mint_to_address`,
      functionArguments: [recipientAddress, amount.toString()]
    }
  });

  const response = await client.signAndSubmitTransaction({
    signer: adminAccount,
    transaction
  });

  return { hash: response.hash, recipient: recipientAddress, amount };
}

async function processPayment(fromAddress, toAddress, amount) {
  console.log(`Processing payment: ${fromAddress} → ${toAddress} (${amount})`);
  const rewardAmount = amount * 1e8;
  const mintResult = await mintTokens(fromAddress, rewardAmount);

  return {
    paymentHash: `mock_payment_${Date.now()}`,
    rewardHash: mintResult.hash,
    amount,
    rewardAmount: rewardAmount / 1e8,
    from: fromAddress,
    to: toAddress
  };
}

function getStatus() {
  return {
    network,
    packageAddress,
    adminInitialized: !!adminAccount,
    adminAddress: adminAccount?.accountAddress.toString()
  };
}

module.exports = {
  createWallet,
  getBalance,
  mintTokens,
  processPayment,
  getStatus,
  get adminAccount() { return adminAccount; },
  client,
  network,
  packageAddress
};