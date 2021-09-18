import { ipcMain, dialog } from 'electron'
import { OpenDialogOptions } from 'electron/main'
import { readFileSync } from 'fs'
import win from '../../win'

ipcMain.handle('event.tools.bookmarks', (e, args: OpenDialogOptions) => {
  const w = win.get('home')
  if (!w) return false
  dialog.showOpenDialog(w, args).then(res => {
    const path = res.filePaths[0]
    const content = readFileSync(path, { encoding: 'utf-8' })
    e.sender.send('event.tools.bookmarks_replay', { content, path })
  })
})
