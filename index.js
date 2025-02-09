const axios = require('axios');
const readline = require('readline');
const fs = require('fs'); // Tambahkan modul fs untuk menulis ke file
const { Web3 } = require('web3');

const web3 = new Web3();

// Static API key for login request
const STATIC_API_KEY = 'dXoriON31OO1UopGakYO9f3tX2c4q3oO7mNsjB2nJsKnW406';

// Tambahkan banner
console.log(`
========================
| Auto Referral Centic |
| @AirdropFamilyIdn    |
========================
`);

// Function to validate private key
function isValidPrivateKey(privateKey) {
  const trimmedKey = privateKey.trim(); // Trim whitespace
  const isValid = /^0x[0-9a-fA-F]{64}$/.test(trimmedKey);
  
  // Log the length and trimmed key for debugging
  //console.log(`Validating private key: '${trimmedKey}' (Length: ${trimmedKey.length})`);
  
  if (!isValid) {
    console.error(`Invalid private key format: ${trimmedKey}`);
  }
  return isValid;
}

// Function to generate a 6-digit nonce
function generateNonce() {
  const nonce = Math.round(1e6 * Math.random());
 // console.log(`Generated nonce:`, nonce); // Debug log
  return nonce;
}

// Function to sign message
async function signMessage(privateKey, message) {
  try {
    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    const signature = await account.sign(message);
    //console.log(`Message to sign:`, message); // Debug log
    //console.log(`Signature:`, signature.signature); // Debug log
    return signature.signature;
  } catch (error) {
    console.error(`Failed to sign message with private key: ${privateKey}. Error:`, error.message);
    return null;
  }
}

// Function to login and get API key
async function login(privateKey) {
  const account = web3.eth.accounts.privateKeyToAccount(privateKey);
  const address = account.address;
  const nonce = generateNonce();
  const message = `I am signing my one-time nonce: ${nonce}.\n\nNote: Sign to log into your Centic account. This is free and will not require a transaction.`;
  const signature = await signMessage(privateKey, message);

  if (!signature) {
    return null;
  }

  const payload = {
    address,
    nonce,
    signature
  };

  try {
    const response = await axios.post('https://develop.centic.io/dev/v3/auth/login', payload, {
      headers: {
        'x-apikey': STATIC_API_KEY
      }
    });
    console.log(`\n`);
    const apiKey = response.data.apiKey;
    if (!apiKey) {
      console.error(`API key not found in response for address: ${address}`);
      return null;
    }
    return { apiKey, address };
  } catch (error) {
    console.error(`Login failed for address: ${address}. Error:`, error.response ? error.response.data : error.message);
    return null;
  }
}

// Function to bind account with referral code
async function bindReferral(apiKey, referralCode, address, privateKey) {
  const payload = {
    referralCode
  };

  try {
    const response = await axios.post('https://develop.centic.io/ctp-api/centic-points/invites', payload, {
      headers: {
        'x-apikey': apiKey
      }
    });
    console.log(`Successfully bind account ${address} with referral code: ${referralCode}`);
    
    // Simpan privateKey dan address ke file akun.txt tanpa menimpa
    fs.appendFile('privatekey.txt', `${privateKey}\n`, (err) => {
      if (err) {
        console.error('Gagal menyimpan ke privatekey.txt:', err);
      } else {
        console.log('Berhasil menyimpan ke privatekey.txt');
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to bind account ${address} with referral code: ${referralCode}. Error:`, error.response ? error.response.data : error.message);
    return null;
  }
}

// Function to add delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to generate Ethereum wallet
function generateEthereumWallet() {
  const account = web3.eth.accounts.create();
 // console.log(`Address: ${account.address}\nPrivate Key: ${account.privateKey}`);
  return account;
}

// Main function to run the bot
async function runBot(referralCode, referralInterval) {
  for (let i = 0; i < referralInterval; i++) { // Ubah dari while (true) ke for loop
    const privateKeys = []; // Initialize an empty array for private keys

    // Generate a new Ethereum wallet and add its private key to the list
    const newAccount = generateEthereumWallet();
    privateKeys.push(newAccount.privateKey);

    for (const privateKey of privateKeys) {
      if (!isValidPrivateKey(privateKey)) {
        console.error(`Invalid private key: ${privateKey}`);
        await delay(5000); // Add 4-second delay
        continue;
      }

      try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const address = account.address;
        const loginResult = await login(privateKey);
        if (!loginResult) {
          await delay(5000);
          continue;
        }

        const { apiKey, address: loginAddress } = loginResult;

        // Bind account with referral code
        console.log(`Proses Referral ${i + 1}/${referralInterval}`);
        await bindReferral(apiKey, referralCode, loginAddress, privateKey);

      } catch (error) {
        console.error(`Error processing private key: ${privateKey}. Error:`, error.message);
      } finally {
        await delay(5000);
      }
    }
    await delay(5000); // Tambahkan jeda 10 detik di antara setiap iterasi
  }
}

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

  // Ask user for referral code
  rl.question('Masukkan kode Referral (contoh: eJwFwQENADAIAzBLO5Ad7LCAhst_i1cohmQ13olAbe89WHmMkZHStPF-9GgLdg==): ', (referralCode) => {
    if (!referralCode) {
      console.error('Kode Referral tidak valid.');
      rl.close();
      return;
    }

    // Ask user for referral interval
    rl.question('Masukkan jumlah Referral: ', (interasi) => {
      const referralInterval = parseInt(interasi);
      if (isNaN(referralInterval) || referralInterval <= 0) {
        console.error('Interval Referral tidak valid.');
        rl.close();
        return;
      }

      // Run the bot with the specified referral code and referral interval
      runBot(referralCode, referralInterval).then(() => {
        console.log('Bot selesai dijalankan.');
        rl.close();
      });
    });
  });
