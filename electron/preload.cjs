const { contextBridge, ipcRenderer } = require("electron");

const api = {
  isElectron: true,
  isDesktop: true,

  detectPython: () => ipcRenderer.invoke("python:detect"),
  installPython: () => ipcRenderer.invoke("python:install"),
  installPipPackages: (slug) => ipcRenderer.invoke("python:install-packages", slug),

  getServiceDefs: () => ipcRenderer.invoke("service:defs"),
  getServiceStatus: () => ipcRenderer.invoke("service:status"),
  startService: (id) => ipcRenderer.invoke("service:start", id),
  stopService: (id) => ipcRenderer.invoke("service:stop", id),

  getModelPath: (rp) => "file://models/" + rp.replace(/\\/g, "/"),
  readModelFile: (rp) => ipcRenderer.invoke("read-model-file", rp),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => process.platform,
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
};

contextBridge.exposeInMainWorld("electronAPI", api);
