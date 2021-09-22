import { ipcMain, dialog } from 'electron'
import os from 'os'
import { OpenDialogOptions } from 'electron/main'
import win from '../../win'

ipcMain.handle('event.win.open', (e, args) => {
  const params = args[0]
  win.open(params.name)
})

ipcMain.handle('event.win.mini', () => {
  win.mini()
})

ipcMain.handle('event.win.max', () => {
  win.max()
})

ipcMain.handle('event.win.close', (e, args) => {
  const params = args[0]
  win.close(params.name)
})

ipcMain.handle('event.win.os', (e) => {
  const sys = os.platform()
  e.sender.send('event.win.os_replay', sys)
})

ipcMain.handle('event.win.dialog', (e, args: OpenDialogOptions) => {
  const w = win.get('home')
  if (!w) return false
  dialog.showOpenDialog(w, args).then(res => {
    e.sender.send('event.win.dialog_replay', res)
  })
})
