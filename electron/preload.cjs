const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe bridge for fetching Enduring Word commentary from the
// main process (the renderer cannot fetch enduringword.com directly because the
// site sends no CORS headers).
contextBridge.exposeInMainWorld('commentary', {
  fetch: (book, chapter) => ipcRenderer.invoke('commentary:fetch', { book, chapter }),
});
