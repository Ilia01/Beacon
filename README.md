# Macro Coach

Desktop overlay for League of Legends that prompts you with macro reminders during games. Built with Electron.

Shows a small beacon in the corner of your screen. Every few seconds it lights up and slides in a coaching prompt - things like "Check minimap - who is missing?" or "Dragon spawns in 60 seconds. Push waves and set up vision NOW". Then it fades back out.

Designed for players with ADHD or anyone who tunnels on lane and forgets the bigger picture.

## How it works

Transparent always-on-top Electron overlay. Cycles through IDLE -> ACTIVE -> COOLDOWN on a timer. 72 prompts sourced from challenger coaching concepts (LS, Coach Curtis, NEACE, Broken By Concept).

Reads live game state via Riot Live Client API and picks the highest-priority signal:

| Signal                           | Prompt category    |
| -------------------------------- | ------------------ |
| Player dead                      | Mental reset       |
| Got a kill                       | Macro follow-up    |
| Objective taken                  | Objectives         |
| Baron/dragon spawning soon       | Objective prep     |
| CS behind lane opponent          | Wave management    |
| Gold in recall range             | Reset timing       |
| Level spike (2, 3, 6, 9, 11, 16) | Trading            |
| Periodic (3-4 min)               | Vision / tab check |
| Nothing else firing              | Map awareness      |

## Setup

```
npm install
npm run build
npm start
```

> [!WARNING]
> For now, the game data poller runs separately. Start it in another terminal before launching a game:
>
> ```
> node server.js
> ```

> [!NOTE]
> `server.js` needs `riotgames.pem` (Riot's local API certificate) in the project root. Grab it from [Riot's developer repo](https://static.developer.riotgames.com/docs/lol/riotgames.pem).

## Stack

- Electron
- TypeScript (main process)
- Plain JS (renderer)
- TypeScript compiled to CommonJS (preload)
- Vitest (testing)
