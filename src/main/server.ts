import axios from 'axios';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ServerMessage } from '../types.js';
import type { GameSnapshot } from '../riot.types.js';

export { isValidSnapshot } from './validation.js';
import { isValidSnapshot } from './validation.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');

if (!process.parentPort) {
  console.error('server must be spawned via Electron utilityProcess.fork()');
  process.exit(1);
}

const { parentPort } = process;

const pemPaths = [
  path.join(process.resourcesPath, 'riotgames.pem'),
  path.join(rootDir, 'riotgames.pem'),
];

let cert: Buffer | undefined;
for (const p of pemPaths) {
  try {
    cert = fs.readFileSync(p);
    break;
  } catch {
    continue;
  }
}

if (!cert) {
  parentPort.postMessage({
    type: 'FETCH_ERROR',
    reason: 'riotgames.pem not found',
  } satisfies ServerMessage);
  process.exit(1);
}

const httpsAgent = new https.Agent({ ca: cert });

async function getLiveGameData(): Promise<ServerMessage> {
  try {
    const { data } = await axios.get(
      'https://127.0.0.1:2999/liveclientdata/allgamedata',
      { httpsAgent, timeout: 1000 },
    );
    if (!isValidSnapshot(data)) {
      return { type: 'FETCH_ERROR', reason: 'Invalid or partial game data' };
    }
    return { type: 'DATA', payload: data as GameSnapshot };
  } catch (error: unknown) {
    return {
      type: 'FETCH_ERROR',
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function startPolling(): Promise<void> {
  const msg = await getLiveGameData();

  parentPort.postMessage(msg);

  const nextDelay = msg.type === 'DATA' ? 1000 : 6000;
  setTimeout(startPolling, nextDelay);
}

await startPolling();
