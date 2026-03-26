import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

type StateChangeEvent =
  | { state: 'active'; prompt: string }
  | { state: 'cooldown' }
  | { state: 'idle' };

contextBridge.exposeInMainWorld('electronAPI', {
  onStateChange: (callback: (data: StateChangeEvent) => void) =>
    ipcRenderer.on(
      'state-change',
      (_event: IpcRendererEvent, value: StateChangeEvent) => callback(value)
    ),
  setIgnoreMouseEvents: (ignore: boolean) => {
    ipcRenderer.send('set-ignore-mouse', ignore);
  },
});
