import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
type StateChangeEvent =
  | { state: 'active'; prompt: string }
  | { state: 'cooldown' }
  | { state: 'idle' };

type AppStatus = { status: 'waiting' } | { status: 'connected' };

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
  setPosition: (position: { dx: number; dy: number }) => {
    ipcRenderer.send('set-position', position);
  },
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),
});
