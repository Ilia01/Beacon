import type { IpcRendererEvent } from 'electron';
import type { StateChangeEvent } from './types.js';

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  onStateChange: (callback: (data: StateChangeEvent) => void) =>
    ipcRenderer.on(
      'state-change',
      (_event: IpcRendererEvent, value: StateChangeEvent) => callback(value)
    ),
});
