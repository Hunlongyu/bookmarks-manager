import { contextBridge, ipcRenderer, shell } from 'electron'

declare global {
  interface Window {
    api: {
      invoke: (channel: string, args?: any[]) => void
      on: (channel: string, listener: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
    }
    shell: {
      openExternal: (url: string) => Promise<void>
    }
  }
}

contextBridge.exposeInMainWorld('api', {
  invoke: (channel: string, data: any[]) => {
    const whitelist = ['event.tools.bookmarks', 'event.win.dialog', 'event.win.os', 'event.win.mini', 'event.win.max', 'event.win.close', 'event.tools.language']
    if (whitelist.includes(channel)) {
      ipcRenderer.invoke(channel, data)
    }
  },
  on: (channel: string, listener: (...args: any[]) => void) => {
    const whitelist = ['event.tools.bookmarks_replay', 'event.win.dialog_replay', 'event.win.os_replay', 'event.tools.language_replay']
    if (whitelist.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args: any[]) => listener(...args))
    }
  },
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel)
  }
})

contextBridge.exposeInMainWorld('shell', {
  openExternal: (url: string): Promise<void> => shell.openExternal(url)
})
