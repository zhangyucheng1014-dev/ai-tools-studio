/**
 * Electron 主进程 — AI 工具台桌面版 v2.0
 */
const { app, BrowserWindow, session, shell, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { detectPython, installPython, installPipPackages } = require("./python-manager.cjs");
const { startService, stopService, stopAllServices, getAllServiceStatus, getServiceDefs } = require("./service-launcher.cjs");

const APP_ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(APP_ROOT, "out");
const MODELS_DIR = path.join(APP_ROOT, "models");
const PORT = 3456;
let mainWindow = null;

const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "application/javascript",
  ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml",
  ".wasm": "application/wasm", ".bin": "application/octet-stream",
  ".webm": "video/webm", ".mp4": "video/mp4", ".woff2": "font/woff2",
};

// ── 静态文件服务器 ─────────────────────────────────────────────────
function serveStatic(req, res) {
  const url = new URL(req.url || "/", "http://localhost:" + PORT);
  let filePath = path.join(OUT_DIR, url.pathname === "/" ? "index.html" : url.pathname);

  // 依次尝试: 精确路径 → +.html → 目录/index.html → SPA fallback
  if (!fs.existsSync(filePath)) {
    // Next.js 导出: /tools/xxx → tools/xxx.html
    if (fs.existsSync(filePath + ".html")) {
      filePath = filePath + ".html";
    } else {
      // 可能是目录
      const dirIndex = path.join(filePath, "index.html");
      if (fs.existsSync(dirIndex)) {
        filePath = dirIndex;
      } else {
        // SPA fallback: 返回 index.html（客户端路由处理）
        filePath = path.join(OUT_DIR, "index.html");
      }
    }
  } else if (fs.statSync(filePath).isDirectory()) {
    const dirIndex = path.join(filePath, "index.html");
    filePath = fs.existsSync(dirIndex) ? dirIndex : path.join(OUT_DIR, "index.html");
  }

  const ext = path.extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Access-Control-Allow-Origin": "*",
  });
  fs.createReadStream(filePath).pipe(res);
}

// ── 本地模型文件 ───────────────────────────────────────────────────
function findModelFile(dir, filename) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, entry.name);
    if (entry.isFile() && entry.name === filename) return fp;
    if (entry.isDirectory()) { const f = findModelFile(fp, filename); if (f) return f; }
  }
  return null;
}

function handleRequest(req, res) {
  const url = new URL(req.url || "/", "http://localhost:" + PORT);
  if (url.pathname.startsWith("/__models/")) {
    const fname = path.basename(url.pathname);
    const fp = findModelFile(MODELS_DIR, fname);
    if (fp) {
      const ext = path.extname(fp);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream", "Access-Control-Allow-Origin": "*" });
      fs.createReadStream(fp).pipe(res);
      return;
    }
    res.writeHead(404); res.end("Not Found");
    return;
  }
  serveStatic(req, res);
}

function startServer() {
  return new Promise((resolve) => {
    http.createServer(handleRequest).listen(PORT, "localhost", () => resolve("http://localhost:" + PORT));
  });
}

// ── 模型 CDN 拦截 ──────────────────────────────────────────────────
function registerModelProtocol() {
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
        callback({ redirectURL: "http://localhost:" + PORT + "/__models/" + basename });
      } else {
        callback({ cancel: false });
      }
    }
  );
}

// ── 创建窗口 ──────────────────────────────────────────────────────
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366, height: 900,
    minWidth: 900, minHeight: 620,
    title: "AI 工具台",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: "#f7f8f5",
    show: false,
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once("ready-to-show", () => mainWindow && mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url); return { action: "deny" };
  });

  await mainWindow.loadURL("http://localhost:" + PORT);
}

// ── IPC ───────────────────────────────────────────────────────────
ipcMain.handle("python:detect", () => detectPython());
ipcMain.handle("python:install", async () => {
  const msgs = []; const ok = await installPython((m) => msgs.push(m)); return { ok, log: msgs };
});
ipcMain.handle("python:install-packages", async (_e, toolSlug) => {
  const msgs = []; const ok = await installPipPackages(toolSlug, (m) => msgs.push(m)); return { ok, log: msgs };
});
ipcMain.handle("service:defs", () => getServiceDefs());
ipcMain.handle("service:status", () => getAllServiceStatus());
ipcMain.handle("service:start", async (_e, id) => {
  const msgs = []; const result = await startService(id, (m) => msgs.push(m)); return { ...result, log: msgs };
});
ipcMain.handle("service:stop", (_e, id) => stopService(id));
ipcMain.handle("read-model-file", async (_e, relativePath) => {
  const fp = path.join(MODELS_DIR, relativePath.replace(/\.\.[\/\\]/g, ""));
  if (!fp.startsWith(MODELS_DIR)) throw new Error("Access denied");
  if (!fs.existsSync(fp)) throw new Error("Not found: " + relativePath);
  return fs.readFileSync(fp).buffer;
});
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("open-external", (_e, url) => { if (/^https?:\/\//.test(url)) shell.openExternal(url); });

// ── 生命周期 ──────────────────────────────────────────────────────
app.whenReady().then(async () => {
  registerModelProtocol();
  await startServer();
  await createWindow();
  app.on("activate", async () => { if (BrowserWindow.getAllWindows().length === 0) await createWindow(); });
});

app.on("window-all-closed", () => { stopAllServices(); app.quit(); });
