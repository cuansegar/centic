const axios = require('axios');
const fs = require('fs');
const { Web3 } = require('web3');

const web3 = new Web3();

// Static API key for login request
const STATIC_API_KEY = 'dXoriON31OO1UopGakYO9f3tX2c4q3oO7mNsjB2nJsKnW406';

// Function to read private keys from file
function readPrivateKeys() {
  const data = fs.readFileSync('privatekey.txt', 'utf8');
  return data.trim().split('\n').filter(key => key.trim() !== '');
}

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
  //console.log(`Generated nonce:`, nonce); // Debug log
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
    //console.error(`Signature failed for address: ${address}`);
    return null;
  }

  const payload = {
    address,
    nonce,
    signature
  };

  //console.log(`Login payload:`, payload); // Debug log

  try {
    const response = await axios.post('https://develop.centic.io/dev/v3/auth/login', payload, {
      headers: {
        'x-apikey': STATIC_API_KEY
      }
    });
    console.log(`Login successful for address: ${address}`);
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

// Function to get daily tasks
async function getDailyTasks(apiKey) {
  try {
    const response = await axios.get('https://develop.centic.io/ctp-api/centic-points/tasks', {
      headers: {
        'x-apikey': apiKey
      }
    });
    console.log(`Successfully mengambil tugas harian.`);

    const tasks = response.data;
    const dailyLoginTask = tasks['Daily login'];
    const dailyTasks = tasks['Daily Tasks'] || [];

    // Prioritaskan Daily login task
    const prioritizedTasks = dailyLoginTask ? [dailyLoginTask, ...dailyTasks] : dailyTasks;

    return {
      ...tasks,
      'Daily Tasks': prioritizedTasks
    };
  } catch (error) {
    console.error(`Failed to get daily tasks. Error:`, error.response ? error.response.data : error.message);
    return {};
  }
}

// Function to claim a task
async function claimTask(apiKey, taskId, point) {
  const payload = {
    taskId,
    point
  };

  try {
    const response = await axios.post('https://develop.centic.io/ctp-api/centic-points/claim-tasks', payload, {
      headers: {
        'x-apikey': apiKey
      }
    });
    console.log(`Task ${taskId} claimed successfully. Response:`, response.data);
  } catch (error) {
    console.error(`Failed to claim task ${taskId}. Error:`, error.response ? error.response.data : error.message);
  }
}

// Function to add delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to format time
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


// Start of Selection
// Main function to run the bot
async function runBot() {
  const privateKeys = readPrivateKeys();
  const totalAccounts = privateKeys.length; // Total akun

  // Print banner
  console.log("==========================");
  console.log("= Auto Claim Task Centic =");
  console.log("==========================");
  console.log(`Total akun : ${totalAccounts}`);
  console.log("==========================");

  while (true) { // Tambahkan loop untuk menjalankan ulang
    for (let i = 0; i < totalAccounts; i++) {
      const privateKey = privateKeys[i];
      console.log(`\nProses akun ke ${i + 1}/${totalAccounts}`); // Log proses akun

      if (!isValidPrivateKey(privateKey)) {
        console.error(`Invalid private key: ${privateKey}`);
        await delay(10000); // Ubah jeda menjadi 10 detik
        continue;
      }

      try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        const address = account.address;
        //console.log(`Processing private key for address: ${address}`);
        const loginResult = await login(privateKey);
        if (!loginResult) {
          await delay(10000); // Ubah jeda menjadi 10 detik
          continue;
        }

        const { apiKey, address: loginAddress } = loginResult;

        // Fetch task list
        const tasks = await getDailyTasks(apiKey);
        if (!tasks) {
          await delay(10000); // Ubah jeda menjadi 10 detik
          continue;
        }

        const dailyTasks = tasks['Daily Tasks'] || [];
        const socialTasks = tasks['Social Tasks'] || [];

        // Claim Daily Tasks
        const dailyLoginTask = dailyTasks.find(task => task.name === "Daily login" && !task.claimed);
        if (dailyLoginTask) {
          console.log(`Claiming daily login task: ${dailyLoginTask.name} points: ${dailyLoginTask.point}`);
          await claimTask(apiKey, dailyLoginTask._id, dailyLoginTask.point);
        }

        for (const task of dailyTasks) {
          if (task.name !== "Daily login" && !task.claimed) {
            console.log(`Claiming daily task: ${task.name} points: ${task.point}`);
            await claimTask(apiKey, task._id, task.point);
          } else if (task.claimed) {
            console.log(`Daily task already claimed: ${task.name}`);
          }
        }

        // Claim Social Tasks
        for (const task of socialTasks) {
          if (!task.claimed) {
            console.log(`Claiming social task: ${task.name} points: ${task.point}`);
            await claimTask(apiKey, task._id, task.point);
          } else {
            console.log(`Social task already claimed: ${task.name}`);
          }
        }
      } catch (error) {
        console.error(`Error processing private key: ${privateKey}. Error:`, error.message);
      } finally {
        await delay(10000); // Ubah jeda menjadi 10 detik setelah setiap proses
      }
    }
    console.log("\nSemua akun telah diproses. Menunggu 5 jam sebelum memulai ulang...");

    // Menampilkan animasi jam mundur
    let remainingTime = 5 * 60 * 60 * 1000; // 5 jam dalam milidetik
    const interval = setInterval(() => {
      process.stdout.write(`\rWaktu tersisa Untuk Mulai Ulang: ${formatTime(remainingTime)}`);
      remainingTime -= 1000;
      if (remainingTime < 0) {
        clearInterval(interval);
        process.stdout.write('\n');
      }
    }, 1000);

    await delay(5 * 60 * 60 * 1000); // Jeda 5 jam
  }
}

// Run the bot
runBot();
