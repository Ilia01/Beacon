"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    onStateChange: (callback) => electron_1.ipcRenderer.on('state-change', (_event, value) => callback(value)),
    onAppStatus: (callback) => electron_1.ipcRenderer.on('app-status', (_event, value) => callback(value)),
    onSpeakPrompt: (callback) => electron_1.ipcRenderer.on('speak-prompt', (_event, value) => callback(value)),
    onGameSummary: (callback) => electron_1.ipcRenderer.on('game-summary', (_event, value) => callback(value)),
    setPosition: (position) => {
        electron_1.ipcRenderer.send('set-position', position);
    },
    getVersion: () => electron_1.ipcRenderer.invoke('get-version'),
});
