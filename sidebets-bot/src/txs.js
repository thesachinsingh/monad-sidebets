require('dotenv').config();
const token = process.env.BOT_TOKEN;
const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(token, { polling: true });
const tokenAddress = process.env.tokenAddress;
const testAddress = process.env.testAddress;
const monTokenAddress = process.env.monTokenAddress;
const senderAddress = process.env.senderAddress;
const privateKey = process.env.privateKey;
const receiverAddress = process.env.receiverAddress;
const address = process.env.senderAddress;
const { createPublicClient, createWalletClient, http, parseUnits } = require('viem');
const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');

const monTokenABI1 = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "src", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "guy", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "dst", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "Deposit",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "src", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "dst", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "src", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "Withdrawal",
    "type": "event"
  },
  { "stateMutability": "payable", "type": "fallback" },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "guy", "type": "address" },
      { "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "dst", "type": "address" },
      { "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "src", "type": "address" },
      { "internalType": "address", "name": "dst", "type": "address" },
      { "internalType": "uint256", "name": "wad", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "wad", "type": "uint256" }],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
const viemPublicClient = createPublicClient({
  chain: {
    id: 10143, // Monad testnet chain ID (update if needed)
    name: 'Monad Testnet',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: ['https://monad-testnet.g.alchemy.com/v2/dlPwS38473qqZH6jgrDp31xxWyj2UDxz'] } },
  },
  transport: http('https://monad-testnet.g.alchemy.com/v2/dlPwS38473qqZH6jgrDp31xxWyj2UDxz'),
});
// Removed web3.js usage, using viem only
async function checkMonadBalance(address) {
  try {
    const balanceWei = await viemPublicClient.getBalance({ address });
    const balanceMon = Number(balanceWei) / 1e18;
    console.log(`Address: ${address}`);
    console.log(`Balance: ${balanceMon} MON`);
    return {
      address: address,
      balance: balanceMon
    };
  } catch (error) {
    console.error('Error checking balance:', error);
    return null;
  }
}

// Example usage

checkMonadBalance(testAddress)
    .then(result => {
        if (result) {
            console.log(result);
            console.log('Hello Balance check successful');
        } else {
            console.log('Failed to check balance');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });

// Setup viem clients

const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : '0x' + privateKey);
const viemWalletClient = createWalletClient({
  account,
  chain: viemPublicClient.chain,
  transport: http('https://monad-testnet.g.alchemy.com/v2/dlPwS38473qqZH6jgrDp31xxWyj2UDxz'),
});



// Example usage: send native MON (not WMON)
const amount = 0.0000000000001091000000000000;
sendMon(amount, receiverAddress)
  .then(hash => console.log('Native MON sent! Tx hash:', hash))
  .catch(error => console.error('Send MON failed', error));

async function sendMon(amount, toAddress) {
  const value = parseUnits(amount.toString(), 18);
  console.log('Value to send (wei):', value);
  console.log('Value to send (MON):', Number(value) / 1e18);
  const hash = await viemWalletClient.sendTransaction({
    to: toAddress,
    value,
  });
  console.log('Native MON sent! Tx hash:', hash);
  return hash;
}

// Utility to get sender's MON balance in wei
async function getMonBalance(address) {
  const balanceHex = await viemPublicClient.getBalance({ address });
  return BigInt(balanceHex);
}

// Utility to estimate gas for a native transfer
async function estimateMonTransferGas(from, to, value) {
  return await viemPublicClient.estimateGas({
    account: from,
    to,
    value,
  });
}

// Send the maximum possible MON, leaving enough for gas
async function sendMaxMon(toAddress) {
  const sender = account.address;
  const balance = await getMonBalance(sender);
  console.log(`Your MON balance (wei): ${balance}`);
  console.log(`Your MON balance (MON): ${Number(balance) / 1e18}`);

  let gasPrice, gas;
  try {
    gasPrice = await viemPublicClient.getGasPrice();
    // Use a small value for estimation to avoid overestimating
    gas = await estimateMonTransferGas(sender, toAddress, 0n);
  } catch (e) {
    gas = 25000n; // Slightly higher fallback
    gasPrice = 1000000000n; // 1 gwei
  }
  console.log(`Estimated gas limit: ${gas}`);
  console.log(`Estimated gas price: ${gasPrice}`);
  console.log(`Estimated gas cost (wei): ${gas * gasPrice}`);
  console.log(`Estimated gas cost (MON): ${(Number(gas) * Number(gasPrice)) / 1e18}`);

  // Calculate max sendable value
  const maxSendable = balance - gas * gasPrice;
  console.log(`Max sendable MON (wei): ${maxSendable}`);
  console.log(`Max sendable MON: ${Number(maxSendable) / 1e18}`);

  if (maxSendable <= 0) {
    throw new Error('Not enough MON to cover gas. Try funding your account with more testnet MON.');
  }

  // As a fallback, if maxSendable is very close to zero, try sending a small fixed amount
  if (maxSendable < parseUnits('0.01', 18)) {
    console.log('Max sendable is very low, trying to send 0.01 MON as a test.');
    return await sendMon(0.01, toAddress);
  }

  // Send transaction
  const hash = await viemWalletClient.sendTransaction({
    to: toAddress,
    value: maxSendable,
  });
  console.log(`Max possible MON sent: ${maxSendable} wei`);
  console.log('Native MON sent! Tx hash:', hash);
  return hash;
}

// Example usage: send the maximum possible MON (leaving enough for gas)
// sendMaxMon(receiverAddress)
//   .then(hash => console.log('Native MON sent! Tx hash:', hash))
//   .catch(error => console.error('Send MON failed', error));

// sendMon(0.01, receiverAddress)
//   .then(hash => console.log('Native MON sent! Tx hash:', hash))
//   .catch(error => console.error('Send MON failed', error));

// Function to create a new wallet and print address and private key
function createNewWallet() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log('New wallet created!');
  console.log('Address:', account.address);
  console.log('Private Key:', privateKey);
  return { address: account.address, privateKey };
}

// Example usage:
// createNewWallet();
// Uncomment the above line to generate a new wallet

// Function to send an exact amount of MON (not max)
async function sendExactMon(amount, toAddress) {
  const sender = account.address;
  const value = parseUnits(amount.toString(), 18);
  const balance = await getMonBalance(sender);
  console.log(`Sender address: ${sender}`);
  console.log(`Sender balance (wei): ${balance}`);
  console.log(`Sender balance (MON): ${Number(balance) / 1e18}`);
  console.log(`Value to send (wei): ${value}`);
  console.log(`Value to send (MON): ${amount}`);

  let gasPrice, gas;
  try {
    gasPrice = await viemPublicClient.getGasPrice();
    gas = await estimateMonTransferGas(sender, toAddress, value);
  } catch (e) {
    gas = 25000n;
    gasPrice = 1000000000n; // 1 gwei
  }
  const gasCost = gas * gasPrice;
  console.log(`Estimated gas limit: ${gas}`);
  console.log(`Estimated gas price: ${gasPrice}`);
  console.log(`Estimated gas cost (wei): ${gasCost}`);
  console.log(`Estimated gas cost (MON): ${Number(gasCost) / 1e18}`);

  if (balance < value + gasCost) {
    throw new Error('Not enough MON to cover value + gas');
  }

  const hash = await viemWalletClient.sendTransaction({
    to: toAddress,
    value,
  });
  console.log(`Sent ${amount} MON! Tx hash:`, hash);
  return hash;
}

// Example usage: send 0.05 MON to receiverAddress
sendExactMon(0.05, receiverAddress)
  .then(hash => console.log('Native MON sent! Tx hash:', hash))
  .catch(error => console.error('Send MON failed', error));
