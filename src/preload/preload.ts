import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AppStatus, StateChangeEvent } from '../ipc-types';

contextBridge.exposeInMainWorld('electronAPI', {
  onStateChange: (callback: (data: StateChangeEvent) => void) =>
    ipcRenderer.on(
      'state-change',
      (_event: IpcRendererEvent, value: StateChangeEvent) => callback(value),
    ),
  onAppStatus: (callback: (data: AppStatus) => void) =>
    ipcRenderer.on('app-status', (_event: IpcRendererEvent, value: AppStatus) =>
      callback(value),
    ),
  onSpeakPrompt: (callback: (text: string) => void) =>
    ipcRenderer.on('speak-prompt', (_event: IpcRendererEvent, value: string) =>
      callback(value),
    ),
  setPosition: (position: { dx: number; dy: number }) => {
    ipcRenderer.send('set-position', position);
  },
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
});
