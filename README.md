# Macro Coach

Desktop overlay for League of Legends that prompts you with macro reminders during games. Built with Electron.

Shows a small beacon in the corner of your screen. Every few seconds it lights up and slides in a coaching prompt - things like "Check minimap - who is missing?" or "Dragon spawns in 60 seconds. Push waves and set up vision NOW". Then it fades back out.

Designed for players with ADHD or anyone who tunnels on lane and forgets the bigger picture.

## How it works

- Electron app with a transparent, always-on-top overlay
- State machine cycles: IDLE (dim dot) -> ACTIVE (glow + prompt slides in) -> COOLDOWN (fades out) -> repeat
- 72 curated prompts across 9 categories: map awareness, wave management, trading, objectives, tab check, macro, vision, reset timing, mental
- Prompts sourced from challenger coaching concepts (LS, Coach Curtis, NEACE, Broken By Concept)
- Context-aware prompt selection via Riot Live Client API. Reads game state every tick and picks the highest-priority signal:

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

## Planned

- [x] Sound beep on active state
- [x] Toggle on/off with Ctrl+Shift+M
- [x] Draggable overlay with position persistence
- [x] Click-through transparent areas
- [x] Riot Live Client API integration (`127.0.0.1:2999`)
  - [x] Game state polling via server.js
  - [x] Context-aware prompt selection based on game events
  - [x] Gold threshold triggers for recall timing
  - [x] Death/kill event triggers
  - [x] Level spike prompts (level 2, 3, 6, 9, 11, 16)
  - [x] Objective spawn timers (dragon, baron, herald)
  - [x] CS comparison with lane opponent
  - [x] Periodic vision and tab check reminders
- [ ] Spawn server.js as child process (no separate terminal)
- [ ] Post-game summary
- [ ] Bind overlay to League client window

## Stack

- Electron
- TypeScript (main process)
- Plain JS (renderer)
- TypeScript compiled to CommonJS (preload)
- Vitest (testing)
