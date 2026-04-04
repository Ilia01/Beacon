import axios from 'axios';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let cert = null;
let httpsAgent = null;

if (!process.parentPort) {
  console.error('server.js must be spawned via Electron utilityProcess.fork()');
  process.exit(1);
}

try {
  cert = fs.readFileSync(path.join(__dirname, 'riotgames.pem'));
  httpsAgent = new https.Agent({ ca: cert });
} catch (error) {
  console.error(
    'riotgames.pem not found. Download it from https://static.developer.riotgames.com/docs/lol/riotgames.pem',
  );
  process.exit(1);
}

async function getLiveGameData() {
  try {
    const { data } = await axios.get(
      'https://127.0.0.1:2999/liveclientdata/allgamedata',
      { httpsAgent, timeout: 1000 },
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function startPolling() {
  const result = await getLiveGameData();

  const nextDelay = result.success ? 1000 : 6000;

  const msg = result.success
    ? { type: 'DATA', payload: result.data }
    : { type: 'FETCH_ERROR', reason: result.error };

  process.parentPort.postMessage(msg);

  setTimeout(startPolling, nextDelay);
}

await startPolling();
