# Beacon

A context-aware coaching overlay for League of Legends. Reads your live game state and gives you the right macro reminder at the right time. Designed for players who tunnel on lane and forget the bigger picture.

Inspired by challenger coaching concepts from LS, Coach Curtis, NEACE, and Broken By Concept.

## How it works

Beacon has two windows: a **hub** that waits for your game to start, and a **transparent overlay** that sits on top of your game. When the Riot client is detected on localhost:2999, the hub disappears and the overlay activates.

The prompt engine polls the Riot Live Client API every second. 14 detectors run on each snapshot, scored by priority and multiplied by the current game phase (early laning, mid laning, mid game, late game). The highest-scoring detector picks a template prompt and fills it with live game data: champion names, gold amounts, CS numbers, respawn timers, etc.

| Detector                    | Category        | Priority |
| --------------------------- | --------------- | -------- |
| Player dead                 | Mental          | 95       |
| Teamfight (3+ kills in 10s) | Macro           | 90       |
| Baron spawning soon         | Objectives      | 88       |
| Got a kill                  | Macro           | 85       |
| Dragon spawning soon        | Objectives      | 82       |
| Objective taken             | Objectives      | 80       |
| Low HP (under 30%)          | Reset timing    | 75       |
| Level spike (2,3,6,9,11,16) | Trading         | 72       |
| Enemy laner dead            | Macro           | 70       |
| Enemy completed an item     | Trading         | 70       |
| You completed an item       | Trading         | 65       |
| KDA adaptive (0/3+)         | Mental          | 60       |
| Sitting on gold (2500+)     | Reset timing    | 60       |
| KDA adaptive (3/0+)         | Macro           | 55       |
| Gold in recall range        | Reset timing    | 50       |
| CS behind lane opponent     | Wave management | 45       |
| Vision reminder (periodic)  | Vision          | 30       |
| Tab check (periodic)        | Tab check       | 25       |
| Nothing else firing         | Map awareness   | fallback |

Prompts use templates with `{placeholders}` filled from live data. Anti-repetition tracks the last 20 prompts and won't repeat the same one within 5 minutes.

## Output modes

Beacon supports three output modes, cycled with `Ctrl+Shift+S`:

- **overlay**: text prompt on the overlay widget
- **speech**: Text-to-Speech via the Web Speech API
- **both**: overlay and speech together

Pause/resume prompts with `Ctrl+Shift+M`.

## Setup

```bash
npm install
npm run build
npm start
```

> [!IMPORTANT]
> You need `riotgames.pem` (Riot's local API certificate) in the project root. Grab it from [Riot's developer repo](https://static.developer.riotgames.com/docs/lol/riotgames.pem).

## Packaging

```
npm run package
npm run dist:win
npm run dist:mac
```

Output goes to `release/`.

> [!NOTE]
> Cross-compiling from macOS to Windows works but code signing may need extra setup.

## Tests

```
npm test
```

## Stack

- Electron (main + utility process for API polling)
- TypeScript (main process, preload compiled as CommonJS)
- Plain JS (renderer)
- Vitest
