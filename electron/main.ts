import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'appfile',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

const recentProjectsFile = () => path.join(app.getPath('userData'), 'recent-projects.json')

type RecentProject = {
  path: string
  name: string
  lastOpened: number
}

const readRecentProjects = (): RecentProject[] => {
  try {
    const raw = fs.readFileSync(recentProjectsFile(), 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => item && typeof item.path === 'string' && typeof item.name === 'string'
      )
    }
  } catch {
    // ignore missing or invalid file
  }
  return []
}

const writeRecentProjects = (projects: RecentProject[]) => {
  fs.writeFileSync(recentProjectsFile(), JSON.stringify(projects, null, 2), 'utf-8')
}

const ensureDir = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  protocol.registerFileProtocol('appfile', (request, callback) => {
    try {
      const url = new URL(request.url)
      let filePath = ''
      if (process.platform === 'win32') {
        if (url.hostname) {
          filePath = `${url.hostname}:${url.pathname}`
        } else {
          filePath = url.pathname
        }
        filePath = decodeURIComponent(filePath).replace(/\//g, '\\')
      } else {
        filePath = decodeURIComponent(url.pathname)
      }
      callback({ path: path.normalize(filePath) })
    } catch {
      callback({ error: -6 })
    }
  })

  createWindow()
})

ipcMain.handle('recent-projects:get', () => readRecentProjects())

ipcMain.handle(
  'recent-projects:add',
  (_event, payload: { path?: string; name?: string }) => {
    if (!payload?.path) return readRecentProjects()
    const existing = readRecentProjects().filter((item) => item.path !== payload.path)
    const name = payload.name || path.basename(payload.path)
    const next: RecentProject[] = [
      { path: payload.path, name, lastOpened: Date.now() },
      ...existing,
    ].slice(0, 10)
    writeRecentProjects(next)
    return next
  }
)

ipcMain.handle('recent-projects:remove', (_event, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') return readRecentProjects()
  const next = readRecentProjects().filter((item) => item.path !== filePath)
  writeRecentProjects(next)
  return next
})

ipcMain.handle('recent-projects:toFileUrl', (_event, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') return null
  return pathToFileURL(filePath).toString()
})

ipcMain.handle('recent-projects:toAppFileUrl', (_event, filePath: string) => {
  if (!filePath || typeof filePath !== 'string') return null
  return pathToFileURL(filePath).toString().replace('file:', 'appfile:')
})

ipcMain.handle(
  'analysis:init',
  (_event, payload: { videoPath?: string }) => {
    if (!payload?.videoPath) return null
    const baseName = path.basename(payload.videoPath, path.extname(payload.videoPath))
    const safeName = baseName.replace(/[<>:"/\\|?*]/g, '_')
    const dirPath = path.dirname(payload.videoPath)
    ensureDir(dirPath)
    const jsonPath = path.join(dirPath, `${safeName}.json`)
    if (!fs.existsSync(jsonPath)) {
      const data = {
        createdAt: Date.now(),
        notes: [],
      }
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
    }
    return jsonPath
  }
)
