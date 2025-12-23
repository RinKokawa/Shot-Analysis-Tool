import { app, BrowserWindow, ipcMain, protocol } from 'electron'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

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

const analysisFilePath = (videoPath: string) => {
  const baseName = path.basename(videoPath, path.extname(videoPath))
  const safeName = baseName.replace(/[<>:"/\\|?*]/g, '_')
  const dirPath = path.dirname(videoPath)
  return path.join(dirPath, `${safeName}.json`)
}

type RangeItem = {
  start: number
  end: number | undefined
  createdAt: number
  title?: string
  note?: string
}

const normalizeRange = (items: unknown): RangeItem[] => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const start =
        typeof record.start === 'number'
          ? record.start
          : typeof record.time === 'number'
            ? record.time
            : null
      if (start === null) return null
      const end = typeof record.end === 'number' ? record.end : undefined
      const createdAt =
        typeof record.createdAt === 'number' ? record.createdAt : Date.now()
      const title = typeof record.title === 'string' ? record.title : undefined
      const note = typeof record.note === 'string' ? record.note : undefined
      return { start, end, createdAt, title, note }
    })
    .filter((item): item is RangeItem => item !== null)
}

const appendRange = (items: RangeItem[], start: number): RangeItem[] => {
  const next = items.slice()
  const last = next[next.length - 1]
  if (last && (last.end === undefined || last.end === null)) {
    last.end = start
  }
  next.push({ start, end: undefined, createdAt: Date.now() })
  return next
}

const closeOpen = (items: RangeItem[], end: number): RangeItem[] => {
  const next = items.slice()
  const last = next[next.length - 1]
  if (last && (last.end === undefined || last.end === null)) {
    last.end = end
  }
  return next
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
    const dirPath = path.dirname(payload.videoPath)
    const jsonPath = analysisFilePath(payload.videoPath)
    ensureDir(dirPath)
    if (!fs.existsSync(jsonPath)) {
      const data = {
        createdAt: Date.now(),
        notes: [],
        acts: [],
        sections: [],
        shots: [],
      }
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
    }
    return jsonPath
  }
)

ipcMain.handle('analysis:read', (_event, payload: { videoPath?: string }) => {
  if (!payload?.videoPath) return null
  const jsonPath = analysisFilePath(payload.videoPath)
  try {
    const raw = fs.readFileSync(jsonPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
})

ipcMain.handle(
  'analysis:addAct',
  (_event, payload: { videoPath?: string; time?: number }) => {
    if (!payload?.videoPath || typeof payload.time !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      existing = { createdAt: Date.now(), notes: [], acts: [], sections: [], shots: [] }
    }
    const acts = appendRange(normalizeRange(existing.acts), payload.time)
    const sections = closeOpen(normalizeRange(existing.sections), payload.time)
    const shots = closeOpen(normalizeRange(existing.shots), payload.time)
    const next = { ...existing, acts, sections, shots, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:updateAct',
  (
    _event,
    payload: {
      videoPath?: string
      createdAt?: number
      start?: number | null
      end?: number | null
      title?: string | null
      note?: string | null
    }
  ) => {
    if (!payload?.videoPath || typeof payload.createdAt !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      return null
    }
    const acts = normalizeRange(existing.acts)
    const updatedActs = acts.map((act) => {
      if (act.createdAt !== payload.createdAt) return act
      const next = { ...act }
      if (typeof payload.start === 'number') next.start = payload.start
      if (typeof payload.end === 'number') next.end = payload.end
      if (payload.end === null) next.end = undefined
      if (typeof payload.title === 'string') next.title = payload.title
      if (payload.title === null) delete next.title
      if (typeof payload.note === 'string') next.note = payload.note
      if (payload.note === null) delete next.note
      return next
    })
    const next = { ...existing, acts: updatedActs, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:updateSection',
  (
    _event,
    payload: {
      videoPath?: string
      createdAt?: number
      start?: number | null
      end?: number | null
      title?: string | null
      note?: string | null
    }
  ) => {
    if (!payload?.videoPath || typeof payload.createdAt !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      return null
    }
    const sections = normalizeRange(existing.sections)
    const updatedSections = sections.map((section) => {
      if (section.createdAt !== payload.createdAt) return section
      const next = { ...section }
      if (typeof payload.start === 'number') next.start = payload.start
      if (typeof payload.end === 'number') next.end = payload.end
      if (payload.end === null) next.end = undefined
      if (typeof payload.title === 'string') next.title = payload.title
      if (payload.title === null) delete next.title
      if (typeof payload.note === 'string') next.note = payload.note
      if (payload.note === null) delete next.note
      return next
    })
    const next = { ...existing, sections: updatedSections, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:updateShot',
  (
    _event,
    payload: {
      videoPath?: string
      createdAt?: number
      start?: number | null
      end?: number | null
      title?: string | null
      note?: string | null
    }
  ) => {
    if (!payload?.videoPath || typeof payload.createdAt !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      return null
    }
    const shots = normalizeRange(existing.shots)
    const updatedShots = shots.map((shot) => {
      if (shot.createdAt !== payload.createdAt) return shot
      const next = { ...shot }
      if (typeof payload.start === 'number') next.start = payload.start
      if (typeof payload.end === 'number') next.end = payload.end
      if (payload.end === null) next.end = undefined
      if (typeof payload.title === 'string') next.title = payload.title
      if (payload.title === null) delete next.title
      if (typeof payload.note === 'string') next.note = payload.note
      if (payload.note === null) delete next.note
      return next
    })
    const next = { ...existing, shots: updatedShots, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:deleteAct',
  (_event, payload: { videoPath?: string; createdAt?: number }) => {
    if (!payload?.videoPath || typeof payload.createdAt !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      return null
    }
    const acts = normalizeRange(existing.acts)
    const nextActs = acts.filter((act) => act.createdAt !== payload.createdAt)
    const next = { ...existing, acts: nextActs, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:addSection',
  (_event, payload: { videoPath?: string; time?: number }) => {
    if (!payload?.videoPath || typeof payload.time !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      existing = { createdAt: Date.now(), notes: [], acts: [], sections: [], shots: [] }
    }
    const sections = appendRange(normalizeRange(existing.sections), payload.time)
    const shots = closeOpen(normalizeRange(existing.shots), payload.time)
    const next = { ...existing, sections, shots, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:addShot',
  (_event, payload: { videoPath?: string; time?: number }) => {
    if (!payload?.videoPath || typeof payload.time !== 'number') return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      existing = { createdAt: Date.now(), notes: [], acts: [], sections: [], shots: [] }
    }
    const shots = appendRange(normalizeRange(existing.shots), payload.time)
    const next = { ...existing, shots, updatedAt: Date.now() }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)

ipcMain.handle(
  'analysis:update',
  (_event, payload: { videoPath?: string; patch?: Record<string, unknown> }) => {
    if (!payload?.videoPath || !payload.patch) return null
    const jsonPath = analysisFilePath(payload.videoPath)
    let existing: Record<string, unknown> = {}
    try {
      const raw = fs.readFileSync(jsonPath, 'utf-8')
      existing = JSON.parse(raw)
    } catch {
      existing = { createdAt: Date.now(), notes: [] }
    }
    const next = { ...existing, ...payload.patch }
    fs.writeFileSync(jsonPath, JSON.stringify(next, null, 2), 'utf-8')
    return next
  }
)
