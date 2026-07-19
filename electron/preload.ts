/**
 * Electron Preload — 暴露安全 API 给渲染进程
 */
import { contextBridge, ipcRenderer } from "electron";

const IS_ELECTRON = true;

export interface PythonStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  pipPackages: string[];
}

export interface ServiceDef {
  id: string;
  name: string;
  port: number;
  repoUrl: string;
}

export interface ServiceInfo {
  id: string;
  name: string;
  port: number;
  status: "stopped" | "starting" | "running" | "error";
}

export interface ElectronAPI {
  isElectron: boolean;
  isDesktop: boolean;

  // Python 环境
  detectPython: () => Promise<PythonStatus>;
  installPython: () => Promise<{ ok: boolean; log: string[] }>;
  installPipPackages: (toolSlug: string) => Promise<{ ok: boolean; log: string[] }>;

  // 服务管理
  getServiceDefs: () => Promise<ServiceDef[]>;
  getServiceStatus: () => Promise<ServiceInfo[]>;
  startService: (id: string) => Promise<{ ok: boolean; port: number; error?: string; log: string[] }>;
  stopService: (id: string) => Promise<boolean>;

  // 通用
  getModelPath: (relativePath: string) => string;
  readModelFile: (relativePath: string) => Promise<ArrayBuffer>;
  getAppVersion: () => Promise<string>;
  getPlatform: () => string;
  openExternal: (url: string) => void;
}

const api: ElectronAPI = {
  isElectron: IS_ELECTRON,
  isDesktop: true,

  detectPython: () => ipcRenderer.invoke("python:detect"),
  installPython: () => ipcRenderer.invoke("python:install"),
  installPipPackages: (slug: string) => ipcRenderer.invoke("python:install-packages", slug),

  getServiceDefs: () => ipcRenderer.invoke("service:defs"),
  getServiceStatus: () => ipcRenderer.invoke("service:status"),
  startService: (id: string) => ipcRenderer.invoke("service:start", id),
  stopService: (id: string) => ipcRenderer.invoke("service:stop", id),

  getModelPath: (rp: string) => "file://models/" + rp.replace(/\\/g, "/"),
  readModelFile: (rp: string) => ipcRenderer.invoke("read-model-file", rp),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
};

contextBridge.exposeInMainWorld("electronAPI", api);
