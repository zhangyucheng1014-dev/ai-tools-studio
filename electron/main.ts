/**
 * Electron 主进程 — AI 工具台桌面版 v2.0
 * 静态文件服务器 + 本地模型 + Python 服务管理
 */
import { app, BrowserWindow, session, shell, ipcMain } from "electron";
import http from "http";
import fs from "fs";
import path from "path";
import { detectPython, installPython, installPipPackages } from "./python-manager";
import { startService, stopService, stopAllServices, getAllServiceStatus, getServiceDefs } from "./service-launcher";

// ── 路径 ──────────────────────────────────────────────────────────
const APP_ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(APP_ROOT, "out");
const MODELS_DIR = path.join(APP_ROOT, "models");
const PORT = 3456;

let mainWindow: BrowserWindow | null = null;

// ── MIME 类型 ─────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".bin": "application/octet-stream",
  ".webm": "video/webm", ".mp4": "video/mp4", ".woff2": "font/woff2",
};

// ── 静态文件服务器 ─────────────────────────────────────────────────
function serveStatic(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  let filePath = path.join(OUT_DIR, url.pathname === "/" ? "index.html" : url.pathname);

  // SPA fallback: HTML 文件不存在时尝试对应的目录 index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  }

  // 如果还不存在，返回 404 或 SPA fallback
  if (!fs.existsSync(filePath)) {
    // 非静态资源 → SPA fallback（Next.js 路由）
    filePath = path.join(OUT_DIR, "404.html");
    if (!fs.existsSync(filePath)) {
      filePath = path.join(OUT_DIR, "index.html");
    }
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
  });
  fs.createReadStream(filePath).pipe(res);
}

function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);

  // 本地模型文件路由
  if (url.pathname.startsWith("/__models/")) {
    const fname = path.basename(url.pathname);
    const fp = findModelFile(MODELS_DIR, fname);
    if (fp) {
      const ext = path.extname(fp);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
      fs.createReadStream(fp).pipe(res);
      return;
    }
    res.writeHead(404); res.end("Model not found");
    return;
  }

  serveStatic(req, res);
}

function startServer(): Promise<string> {
  return new Promise((resolve) => {
    const server = http.createServer(handleRequest);
    server.listen(PORT, "localhost", () => {
      resolve(`http://localhost:${PORT}`);
    });
  });
}

// ── 本地模型协议 ───────────────────────────────────────────────────
function findModelFile(dir: string, filename: string): string | null {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return fp;
    if (entry.isDirectory()) {
      const found = findModelFile(fp, filename);
      if (found) return found;
    }
  }
  return null;
}

function registerModelProtocol() {
  // 拦截 MLC CDN 请求 → 重定向到本地 /__models/ 路由
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: [
      "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/*",
      "https://huggingface.co/mlc-ai/*/resolve/main/*",
      "https://cdn.jsdelivr.net/npm/@mlc-ai/*",
    ]},
    (details, callback) => {
      const basename = path.basename(new URL(details.url).pathname);
      const localPath = findModelFile(MODELS_DIR, basename);
      if (localPath) {
        callback({ redirectURL: `http://localhost:${PORT}/__models/${basename}` });
      } else {
        callback({ cancel: false }); // 降级到 CDN
      }
    }
  );
}

// ── 窗口创建 ──────────────────────────────────────────────────────

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366, height: 900,
    minWidth: 900, minHeight: 620,
    title: "AI 工具台",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: "#f7f8f5",
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); return { action: "deny" };
  });

  await mainWindow.loadURL(`http://localhost:${PORT}`);
}

// ── IPC ───────────────────────────────────────────────────────────

ipcMain.handle("read-model-file", async (_e, relativePath: string) => {
  const fp = path.join(MODELS_DIR, relativePath.replace(/\.\.[\/\\]/g, ""));
  if (!fp.startsWith(MODELS_DIR)) throw new Error("Access denied");
  if (!fs.existsSync(fp)) throw new Error(`Not found: ${relativePath}`);
  return fs.readFileSync(fp).buffer;
});

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("open-external", (_e, url: string) => {
  if (/^https?:\/\//.test(url)) shell.openExternal(url);
});

// ── Python 环境 IPC ──────────────────────────────────────────────

ipcMain.handle("python:detect", () => detectPython());
ipcMain.handle("python:install", async (_e, _args, _win) => {
  const msgs: string[] = [];
  const ok = await installPython((m) => msgs.push(m));
  return { ok, log: msgs };
});
ipcMain.handle("python:install-packages", async (_e, toolSlug: string) => {
  const msgs: string[] = [];
  const ok = await installPipPackages(toolSlug, (m) => msgs.push(m));
  return { ok, log: msgs };
});

// ── 服务管理 IPC ─────────────────────────────────────────────────

ipcMain.handle("service:defs", () => getServiceDefs());
ipcMain.handle("service:status", () => getAllServiceStatus());
ipcMain.handle("service:start", async (_e, id: string) => {
  const msgs: string[] = [];
  const result = await startService(id, (m) => msgs.push(m));
  return { ...result, log: msgs };
});
ipcMain.handle("service:stop", (_e, id: string) => stopService(id));

// ── 生命周期 ──────────────────────────────────────────────────────

app.whenReady().then(async () => {
  registerModelProtocol();
  await startServer();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  stopAllServices();
  app.quit();
});
