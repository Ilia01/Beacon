import axios from 'axios';
import https from 'node:https';
import fs from 'node:fs';

let cert = null;
let httpsAgent = null;

try {
  cert = fs.readFileSync('riotgames.pem');
  httpsAgent = new https.Agent({ ca: cert });
} catch (error) {
  console.error(
    'riotgames.pem not found. Download it from https://static.developer.riotgames.com/docs/lol/riotgames.pem',
  );
  process.exit(1);
}

async function getLiveGameData() {
  try {
    const response = await axios.get(
      'https://127.0.0.1:2999/liveclientdata/allgamedata',
      { httpsAgent, timeout: 1000 },
    );
    saveData(response.data);
    return true;
  } catch (error) {
    if (fs.existsSync('current.json')) {
      fs.unlinkSync('current.json');
    }
    console.log(error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

function saveData(newData) {
  fs.writeFileSync('current.json.tmp', JSON.stringify(newData));
  fs.renameSync('current.json.tmp', 'current.json');
}

async function startPolling() {
  const success = await getLiveGameData();

  const nextDelay = success ? 1000 : 6000;

  if (!success) console.log('Game not found, retrying in 6s...');

  setTimeout(startPolling, nextDelay);
}

await startPolling();
