import path from 'path'
import { BrowserWindowConstructorOptions } from 'electron'

const isDevelopment = process.env.NODE_ENV !== 'production'

interface BWConfig {
  [type: string]: BrowserWindowConstructorOptions
}

const config: BWConfig = {
  default: {
    webPreferences: {
      webSecurity: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false
    }
  },
  home: {
    frame: false,
    width: isDevelopment ? 1624 : 1024,
    height: 760
  }
}

export default config
