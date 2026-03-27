# Macro Coach

Desktop overlay for League of Legends that prompts you with macro reminders during games. Built with Electron.

Shows a small beacon in the corner of your screen. Every few seconds it lights up and slides in a coaching prompt - things like "Check minimap - who is missing?" or "Dragon spawns in 60 seconds. Push waves and set up vision NOW". Then it fades back out.

Designed for players with ADHD or anyone who tunnels on lane and forgets the bigger picture.

## How it works

- Electron app with a transparent, always-on-top overlay
- State machine cycles: IDLE (dim dot) -> ACTIVE (glow + prompt slides in) -> COOLDOWN (fades out) -> repeat
- 72 curated prompts across 9 categories: map awareness, wave management, trading, objectives, tab check, macro, vision, reset timing, mental
- Prompts sourced from challenger coaching concepts (LS, Coach Curtis, NEACE, Broken By Concept)
- Context-aware prompt selection reads live game state and picks the most relevant category based on 10 priority-ordered signals:
  1. Player death -> mental reset prompts
  2. Player kill -> macro follow-up prompts
  3. Objective taken -> objective prompts
  4. Baron/dragon upcoming -> objective prep prompts
  5. CS behind -> wave management prompts
  6. Gold in recall window -> reset timing prompts
  7. Sitting on gold -> reset timing prompts
  8. Level spike (2, 3, 6, 9, 11, 16) -> trading prompts
  9. Vision check (every 4 min) -> vision prompts
  10. Tab check (every 3 min) -> tab check prompts
  11. Fallback -> map awareness prompts

## Setup

```
npm install
npm run build
npm start
```

In a separate terminal, start the game data poller (requires a game to be running):

```
node server.js
```

`server.js` needs `riotgames.pem` (Riot's local API certificate) in the project root. You can extract it from the League client directory.

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
