import Groq from 'groq-sdk';
import type { GameSnapshot } from '../riot.types.js';
import type { GamePhase } from './phases.js';

let groq: Groq | null = null;
let apiKey: string | null = null;

const recentPhrases: string[] = [];
const MAX_RECENT = 6;

export function setGroqApiKey(key: string): void {
  apiKey = key;
  groq = null;
}

export function resetCoachHistory(): void {
  recentPhrases.length = 0;
}

function getClient(): Groq | null {
  if (groq) return groq;
  if (!apiKey) return null;
  groq = new Groq({ apiKey });
  return groq;
}

function getPlayerContext(snapshot: GameSnapshot): string {
  const { activePlayer, allPlayers } = snapshot;
  const me = allPlayers.find((p) => p.riotId === activePlayer.riotId);
  if (!me) return '';

  const enemyLaner = allPlayers.find(
    (p) => p.team !== me.team && p.position === me.position,
  );

  const parts = [
    `Champion: ${me.championName}`,
    `Role: ${me.position}`,
    `Level: ${activePlayer.level}`,
    `KDA: ${me.scores.kills}/${me.scores.deaths}/${me.scores.assists}`,
  ];

  if (enemyLaner) {
    parts.push(`Lane opponent: ${enemyLaner.championName}`);
  }

  return parts.join(', ');
}

const SYSTEM_PROMPT = `Rephrase a League of Legends coaching reminder. Output ONLY the rephrased line.

RULES:
- 1 short sentence. Max 15 words.
- Same meaning. Do NOT add advice, strategy, or facts.
- Use the champion name instead of "you".
- Sound like a coach on comms: punchy, clipped, zero filler.
- No quotes, no preamble, no explanation.`;

export async function rephrasePrompt(
  basePrompt: string,
  snapshot: GameSnapshot,
  phase: GamePhase,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const playerContext = getPlayerContext(snapshot);
  const minutes = Math.floor(snapshot.gameData.gameTime / 60);
  const seconds = String(Math.floor(snapshot.gameData.gameTime % 60)).padStart(
    2,
    '0',
  );

  const recentBlock =
    recentPhrases.length > 0
      ? `\nRecent callouts (phrase it differently from these):\n${recentPhrases.map((p) => `- "${p}"`).join('\n')}`
      : '';

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Game time: ${minutes}:${seconds} (${phase.replace('_', ' ')})\n${playerContext}\n\nRephrase this: "${basePrompt}"${recentBlock}`,
        },
      ],
      max_tokens: 35,
      temperature: 0.7,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? null;
    if (text) {
      recentPhrases.unshift(text);
      if (recentPhrases.length > MAX_RECENT) {
        recentPhrases.pop();
      }
    }
    return text;
  } catch {
    return null;
  }
}
