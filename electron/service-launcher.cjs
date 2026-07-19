/**
 * 本地服务启动器 — 管理用户指定的开源工具
 */
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { detectPython } = require("./python-manager.cjs");

const SERVICES_DIR = path.join(os.homedir(), ".ai-tools-studio", "services");
const runningServices = new Map();

const SERVICE_DEFS = [
  {
    id: "video-downloader",
    name: "TikTokDownloader",
    port: 8001,
    repoUrl: "https://github.com/JoeanAmier/TikTokDownloader.git",
    startScript: "python main.py --port 8001",
    checkPath: "main.py",
  },
  {
    id: "digital-human",
    name: "HeyGem",
    port: 8002,
    repoUrl: "https://github.com/GuijiAI/HeyGem.ai.git",
    startScript: "python main.py --port 8002",
    checkPath: "main.py",
  },
  {
    id: "ai-voice",
    name: "GPT-SoVITS",
    port: 8003,
    repoUrl: "https://github.com/RVC-Boss/GPT-SoVITS.git",
    startScript: "python api_v2.py --port 8003",
    checkPath: "api_v2.py",
  },
  {
    id: "video-factory",
    name: "MoneyPrinterTurbo",
    port: 8005,
    repoUrl: "https://github.com/harry0703/MoneyPrinterTurbo.git",
    startScript: "python main.py --port 8005",
    checkPath: "main.py",
  },
  {
    id: "multi-platform-publish",
    name: "social-auto-upload",
    port: 8007,
    repoUrl: "https://github.com/dreammis/social-auto-upload.git",
    startScript: "python main.py --port 8007",
    checkPath: "main.py",
  },
];

function getServiceDefs() { return SERVICE_DEFS; }
function getAllServiceStatus() {
  return SERVICE_DEFS.map(def => {
    const running = runningServices.get(def.id);
    return { id: def.id, name: def.name, port: def.port, status: running ? running.status : "stopped" };
  });
}

function cloneRepo(repoUrl, targetDir, onLog) {
  return new Promise((resolve) => {
    if (fs.existsSync(path.join(targetDir, ".git"))) {
      if (onLog) onLog("仓库已存在，拉取更新…");
      const p = spawn("git", ["-C", targetDir, "pull"], { stdio: "pipe" });
      p.on("close", (code) => resolve(code === 0));
      return;
    }
    if (onLog) onLog("正在克隆 " + repoUrl + " …");
    const p = spawn("git", ["clone", "--depth=1", repoUrl, targetDir], { stdio: "pipe" });
    p.on("close", (code) => resolve(code === 0));
    p.stderr && p.stderr.on("data", d => onLog && onLog(d.toString()));
  });
}

async function startService(id, onLog) {
  const def = SERVICE_DEFS.find(s => s.id === id);
  if (!def) return { ok: false, port: 0, error: "未知服务" };

  const existing = runningServices.get(id);
  if (existing && existing.status === "running") return { ok: true, port: def.port };

  const py = detectPython();
  if (!py.installed) return { ok: false, port: 0, error: "Python 未安装，请先在首页安装 Python" };

  const serviceDir = path.join(SERVICES_DIR, id);
  fs.mkdirSync(serviceDir, { recursive: true });

  if (onLog) onLog("准备 " + def.name + " 环境…");
  const cloned = await cloneRepo(def.repoUrl, serviceDir, onLog);
  if (!cloned) return { ok: false, port: 0, error: "仓库克隆失败，请检查网络" };

  const reqFile = path.join(serviceDir, "requirements.txt");
  if (fs.existsSync(reqFile)) {
    if (onLog) onLog("安装 Python 依赖（可能需要几分钟）…");
    const r = spawnSync(py.path, ["-m", "pip", "install", "-r", "requirements.txt", "-q"], {
      cwd: serviceDir, stdio: "pipe", timeout: 600000,
    });
    if (r.status !== 0 && onLog) {
      onLog("依赖安装警告: " + (r.stderr ? r.stderr.toString().slice(0, 200) : ""));
    }
  }

  if (onLog) onLog("启动 " + def.name + " (端口 " + def.port + ")…");
  const args = def.startScript.split(" ").slice(1);
  const proc = spawn(py.path, args, {
    cwd: serviceDir, stdio: "pipe",
    env: { ...process.env, PORT: String(def.port) },
  });

  const info = { ...def, status: "starting", process: proc };
  runningServices.set(id, info);

  proc.stdout && proc.stdout.on("data", d => {
    const msg = d.toString();
    if (onLog) onLog(msg);
    if (msg.includes("Running on") || msg.includes("started") || msg.includes("http")) info.status = "running";
  });
  proc.on("close", (code) => { info.status = code === 0 ? "stopped" : "error"; runningServices.delete(id); });
  proc.on("error", (err) => { info.status = "error"; runningServices.delete(id); if (onLog) onLog("启动失败: " + err.message); });

  // 等待启动（最多 30 秒）
  await new Promise(resolve => {
    let waited = 0;
    const timer = setInterval(() => {
      waited += 500;
      if (info.status === "running" || waited > 30000) { clearInterval(timer); resolve(); }
    }, 500);
  });

  if (info.status === "running") return { ok: true, port: def.port };
  return { ok: false, port: 0, error: "服务启动超时（30秒），请检查终端输出" };
}

function stopService(id) {
  const info = runningServices.get(id);
  if (!info || !info.process) return false;
  info.process.kill("SIGTERM");
  setTimeout(() => { if (info.process && !info.process.killed) info.process.kill("SIGKILL"); }, 5000);
  runningServices.delete(id);
  return true;
}

function stopAllServices() { for (const id of runningServices.keys()) stopService(id); }

module.exports = { getServiceDefs, getAllServiceStatus, startService, stopService, stopAllServices };
