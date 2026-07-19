/**
 * 本地服务启动器
 * 管理 Python 后端服务的生命周期（启动/停止/健康检查）
 */
import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { detectPython, PYTHON_DIR } from "./python-manager";

const SERVICES_DIR = path.join(os.homedir(), ".ai-tools-studio", "services");

export interface ServiceInfo {
  id: string;
  name: string;
  port: number;
  status: "stopped" | "starting" | "running" | "error";
  process: ChildProcess | null;
  repoUrl: string;
  startScript: string;
  checkPath: string;
}

// ── 服务定义 ────────────────────────────────────────────────────────

const SERVICE_DEFS: Omit<ServiceInfo, "status" | "process">[] = [
  {
    id: "video-downloader",
    name: "视频下载",
    port: 8001,
    repoUrl: "https://github.com/JoeanAmier/TikTokDownloader.git",
    startScript: "python main.py --port 8001",
    checkPath: "main.py",
  },
  {
    id: "digital-human",
    name: "数字人引擎",
    port: 8002,
    repoUrl: "https://github.com/OpenTalker/SadTalker.git",
    startScript: "python app_sadtalker.py --port 8002",
    checkPath: "app_sadtalker.py",
  },
  {
    id: "ai-voice",
    name: "AI 配音引擎",
    port: 8003,
    repoUrl: "https://github.com/RVC-Boss/GPT-SoVITS.git",
    startScript: "python api_v2.py --port 8003",
    checkPath: "api_v2.py",
  },
  {
    id: "video-factory",
    name: "视频制作引擎",
    port: 8005,
    repoUrl: "https://github.com/harry0703/MoneyPrinterTurbo.git",
    startScript: "python main.py --port 8005",
    checkPath: "main.py",
  },
  {
    id: "video-enhancer",
    name: "视频增强引擎",
    port: 8006,
    repoUrl: "https://github.com/xinntao/Real-ESRGAN.git",
    startScript: "python inference_realesrgan.py --port 8006",
    checkPath: "inference_realesrgan.py",
  },
];

// ── 活跃服务 ────────────────────────────────────────────────────────

const runningServices = new Map<string, ServiceInfo>();

export function getServiceDefs() {
  return SERVICE_DEFS;
}

export function getServiceStatus(id: string): ServiceInfo | null {
  return runningServices.get(id) || null;
}

export function getAllServiceStatus(): ServiceInfo[] {
  return SERVICE_DEFS.map(def => {
    const running = runningServices.get(def.id);
    return { ...def, status: running?.status || "stopped", process: running?.process || null };
  });
}

// ── Git Clone ──────────────────────────────────────────────────────

function cloneRepo(repoUrl: string, targetDir: string, onLog?: (msg: string) => void): Promise<boolean> {
  return new Promise((resolve) => {
    if (fs.existsSync(path.join(targetDir, ".git"))) {
      onLog?.("仓库已存在，拉取更新…");
      const p = spawn("git", ["-C", targetDir, "pull"], { stdio: "pipe" });
      p.on("close", (code) => resolve(code === 0));
      p.stderr?.on("data", d => onLog?.(d.toString()));
      return;
    }

    onLog?.("正在克隆仓库…");
    const p = spawn("git", ["clone", "--depth=1", repoUrl, targetDir], { stdio: "pipe" });
    p.on("close", (code) => resolve(code === 0));
    p.stderr?.on("data", d => onLog?.(d.toString()));
    p.stdout?.on("data", d => onLog?.(d.toString()));
  });
}

// ── 启动服务 ────────────────────────────────────────────────────────

export async function startService(
  id: string,
  onLog?: (msg: string) => void
): Promise<{ ok: boolean; port: number; error?: string }> {
  const def = SERVICE_DEFS.find(s => s.id === id);
  if (!def) return { ok: false, port: 0, error: "未知服务" };

  // 检查是否已运行
  const existing = runningServices.get(id);
  if (existing?.status === "running") {
    return { ok: true, port: def.port };
  }

  // 检测 Python
  const py = detectPython();
  if (!py.installed) {
    return { ok: false, port: 0, error: "Python 未安装，请先安装 Python 3.10+" };
  }

  const serviceDir = path.join(SERVICES_DIR, id);
  fs.mkdirSync(serviceDir, { recursive: true });

  // Clone 仓库
  onLog?.(`准备 ${def.name} 环境…`);
  const cloned = await cloneRepo(def.repoUrl, serviceDir, onLog);
  if (!cloned) {
    return { ok: false, port: 0, error: "仓库克隆失败，请检查网络" };
  }

  // 安装依赖
  const reqFile = path.join(serviceDir, "requirements.txt");
  if (fs.existsSync(reqFile)) {
    onLog?.("安装 Python 依赖…");
    try {
      const { spawnSync } = require("child_process");
      const r = spawnSync(py.path!, ["-m", "pip", "install", "-r", "requirements.txt", "-q"], {
        cwd: serviceDir, stdio: "pipe", timeout: 600000,
      });
      if (r.status !== 0) {
        onLog?.(`依赖安装警告: ${r.stderr?.toString().slice(0, 200)}`);
      }
    } catch {}
  }

  // 启动服务
  onLog?.(`启动 ${def.name} (端口 ${def.port})…`);
  const args = def.startScript.split(" ").slice(1);
  const proc = spawn(py.path!, args, {
    cwd: serviceDir,
    stdio: "pipe",
    env: { ...process.env, PORT: String(def.port) },
  });

  const info: ServiceInfo = { ...def, status: "starting", process: proc };
  runningServices.set(id, info);

  // 监听输出
  proc.stdout?.on("data", d => {
    const msg = d.toString();
    onLog?.(msg);
    // 检测启动成功标志
    if (msg.includes("Running on") || msg.includes("started") || msg.includes("http")) {
      info.status = "running";
    }
  });
  proc.stderr?.on("data", d => onLog?.(`[ERR] ${d.toString().slice(0, 200)}`));

  proc.on("close", (code) => {
    info.status = code === 0 ? "stopped" : "error";
    runningServices.delete(id);
  });

  proc.on("error", (err) => {
    info.status = "error";
    runningServices.delete(id);
    onLog?.(`启动失败: ${err.message}`);
  });

  // 等待启动（最多 30 秒）
  await new Promise<void>(resolve => {
    let waited = 0;
    const timer = setInterval(() => {
      waited += 500;
      if (info.status === "running" || waited > 30000) {
        clearInterval(timer);
        resolve();
      }
    }, 500);
  });

  if (info.status === "running") {
    return { ok: true, port: def.port };
  }
  return { ok: false, port: 0, error: "服务启动超时" };
}

// ── 停止服务 ────────────────────────────────────────────────────────

export function stopService(id: string): boolean {
  const info = runningServices.get(id);
  if (!info?.process) return false;

  info.process.kill("SIGTERM");
  setTimeout(() => {
    if (info.process && !info.process.killed) {
      info.process.kill("SIGKILL");
    }
  }, 5000);

  runningServices.delete(id);
  return true;
}

export function stopAllServices() {
  for (const id of runningServices.keys()) {
    stopService(id);
  }
}
