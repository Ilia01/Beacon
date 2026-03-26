# Macro Coach

Desktop overlay for League of Legends that prompts you with macro reminders during games. Built with Electron.

Shows a small beacon in the corner of your screen. Every few seconds it lights up and slides in a coaching prompt - things like "Check minimap - who is missing?" or "Dragon spawns in 60 seconds. Push waves and set up vision NOW". Then it fades back out.

Designed for players with ADHD or anyone who tunnels on lane and forgets the bigger picture.

## How it works

- Electron app with a transparent, always-on-top overlay
- State machine cycles: IDLE (dim dot) -> ACTIVE (glow + prompt slides in) -> COOLDOWN (fades out) -> repeat
- 72 curated prompts across 9 categories: map awareness, wave management, trading, objectives, tab check, macro, vision, reset timing, mental
- Prompts sourced from challenger coaching concepts (LS, Coach Curtis, NEACE, Broken By Concept)

## Planned

- [x] Sound beep on active state
- [x] Toggle on/off with Ctrl+Shift+M
- [ ] Save/restore overlay position
- [ ] Riot Live Client API integration (`127.0.0.1:2999`)
  - [ ] Phase-aware prompt selection based on game time (early/mid/late)
  - [ ] Gold threshold triggers for recall timing
  - [ ] Death/kill event triggers
  - [ ] Level spike prompts (level 2, level 6)
  - [ ] Item completion detection
  - [ ] Objective spawn timers
- [ ] Post-game summary

## Setup

```
npm install
npm run build
npm start
```

## Stack

- Electron
- TypeScript (main process)
- Plain JS (renderer)
- TypeScript compiled to CommonJS (preload)
