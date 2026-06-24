const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseCommentaryHtml, buildCommentaryUrl } = require('./commentaryParser.cjs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Bible App',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // In production, load the built files; in dev, load the Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- Enduring Word commentary live fetch (with on-disk cache) ---

function commentaryCacheDir() {
  const dir = path.join(app.getPath('userData'), 'commentary-cache');
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch { /* ignore */ }
  return dir;
}

function cacheFileFor(book, chapter) {
  const safe = `${book}-${chapter}`.replace(/[^a-zA-Z0-9-]+/g, '_');
  return path.join(commentaryCacheDir(), `${safe}.json`);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const request = net.request({ url, redirect: 'manual' });
    request.setHeader('User-Agent', 'BibleApp/1.0 (+commentary)');
    let finalUrl = url;
    request.on('redirect', (status, _method, redirectUrl) => {
      finalUrl = redirectUrl;
      request.followRedirect();
    });
    request.on('response', (response) => {
      if (response.statusCode === 404) {
        resolve(null);
        return;
      }
      if (response.statusCode >= 400) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (c) => chunks.push(c));
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf-8'), finalUrl }));
      response.on('error', reject);
    });
    request.on('error', reject);
    request.end();
  });
}

async function fetchCommentary(book, chapter) {
  const cacheFile = cacheFileFor(book, chapter);
  try {
    if (fs.existsSync(cacheFile)) {
      return JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
  } catch { /* ignore corrupt cache */ }

  const url = buildCommentaryUrl(book, chapter);
  const fetched = await fetchUrl(url);
  if (fetched === null) {
    const empty = { book, chapter, source: 'Enduring Word', url, sections: [] };
    try { fs.writeFileSync(cacheFile, JSON.stringify(empty)); } catch { /* ignore */ }
    return empty;
  }
  const parsed = parseCommentaryHtml(fetched.html, book, chapter, fetched.finalUrl) || {
    book, chapter, source: 'Enduring Word', url, sections: [],
  };
  try { fs.writeFileSync(cacheFile, JSON.stringify(parsed)); } catch { /* ignore */ }
  return parsed;
}

ipcMain.handle('commentary:fetch', async (_event, { book, chapter }) => {
  try {
    return { ok: true, data: await fetchCommentary(book, chapter) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
