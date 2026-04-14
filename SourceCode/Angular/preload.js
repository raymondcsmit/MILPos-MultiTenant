const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Cloud Login Handler
  cloudLogin: (email, password) => ipcRenderer.invoke('cloud-login', { email, password }),
  
  // Progress listener for the splash screen
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback),
  
  // Standard auth handlers from Sprint 3 (if needed by renderer)
  saveAuth: (config) => ipcRenderer.invoke('save-auth', config),
  getAuth: () => ipcRenderer.invoke('get-auth'),
  clearAuth: () => ipcRenderer.invoke('clear-auth')
});
