/**
 * Python 环境管理器
 * 检测 → 自动安装 embeddable Python → 管理 pip 包
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";

const PYTHON_DIR = path.join(os.homedir(), ".ai-tools-studio", "python");
const PYTHON_EXE = process.platform === "win32"
  ? path.join(PYTHON_DIR, "python.exe")
  : path.join(PYTHON_DIR, "bin", "python3");

export interface PythonStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  pipPackages: string[];
}

// ── 检测 Python ────────────────────────────────────────────────────

export function detectPython(): PythonStatus {
  // 1. 检查内置 portable Python
  if (fs.existsSync(PYTHON_EXE)) {
    try {
      const out = execSync(`"${PYTHON_EXE}" --version`, { encoding: "utf-8" });
      return {
        installed: true,
        version: out.trim(),
        path: PYTHON_EXE,
        pipPackages: listPipPackages(PYTHON_EXE),
      };
    } catch {}
  }

  // 2. 检查系统 Python
  const sysCmds = process.platform === "win32" ? ["python", "python3", "py -3"] : ["python3", "python"];
  for (const cmd of sysCmds) {
    try {
      const out = execSync(`${cmd} --version 2>&1`, { encoding: "utf-8", shell: true });
      if (out.includes("Python")) {
        const pyPath = cmd.split(" ")[0];
        const realPath = findSystemPython(pyPath);
        return {
          installed: true,
          version: out.trim(),
          path: realPath || pyPath,
          pipPackages: listPipPackages(realPath || pyPath),
        };
      }
    } catch {}
  }

  return { installed: false, version: null, path: null, pipPackages: [] };
}

function findSystemPython(cmd: string): string | null {
  try {
    const out = process.platform === "win32"
      ? execSync(`where ${cmd}`, { encoding: "utf-8" })
      : execSync(`which ${cmd}`, { encoding: "utf-8" });
    return out.split("\n")[0]?.trim() || null;
  } catch { return null; }
}

function listPipPackages(pyPath: string): string[] {
  try {
    const out = execSync(`"${pyPath}" -m pip list --format=freeze 2>/dev/null`, { encoding: "utf-8", timeout: 10000 });
    return out.split("\n").filter(Boolean).map(l => l.split("==")[0].toLowerCase());
  } catch { return []; }
}

// ── 安装 Python (Windows embeddable) ────────────────────────────────

export async function installPython(onProgress?: (msg: string) => void): Promise<boolean> {
  if (process.platform !== "win32") {
    onProgress?.("非 Windows 系统，请手动安装 Python 3.10+");
    return false;
  }

  onProgress?.("正在下载 Python 3.10…");
  fs.mkdirSync(PYTHON_DIR, { recursive: true });

  const zipUrl = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip";
  const zipPath = path.join(PYTHON_DIR, "python.zip");

  try {
    // 下载 embeddable Python (~6MB)
    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);
      https.get(zipUrl, (res: any) => {
        if (res.statusCode === 302) {
          https.get(res.headers.location, (r2: any) => r2.pipe(file));
          return;
        }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }).on("error", reject);
    });

    onProgress?.("正在解压…");
    // 解压
    if (process.platform === "win32") {
      execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${PYTHON_DIR}' -Force"`);
    }
    fs.unlinkSync(zipPath);

    // 启用 pip（修改 python310._pth 文件）
    const pthFile = path.join(PYTHON_DIR, "python310._pth");
    if (fs.existsSync(pthFile)) {
      let content = fs.readFileSync(pthFile, "utf-8");
      content = content.replace("#import site", "import site");
      fs.writeFileSync(pthFile, content);
    }

    // 安装 pip
    onProgress?.("正在安装 pip…");
    execSync(`"${PYTHON_EXE}" -m ensurepip`, { stdio: "pipe" });

    onProgress?.("Python 安装完成！");
    return true;
  } catch (e: any) {
    onProgress?.(`安装失败: ${e.message}`);
    return false;
  }
}

// ── pip 包管理 ─────────────────────────────────────────────────────

const REQUIRED_PACKAGES: Record<string, { packages: string[]; desc: string }> = {
  "video-downloader": {
    packages: [], // TikTokDownloader 是单独的项目，用 git clone
    desc: "视频下载服务"
  },
  "ai-voice": {
    packages: ["numpy", "scipy", "soundfile", "torch", "transformers"],
    desc: "GPT-SoVITS AI 配音"
  },
  "digital-human": {
    packages: ["numpy", "opencv-python", "torch", "imageio"],
    desc: "SadTalker 数字人"
  },
  "video-factory": {
    packages: ["moviepy", "pillow", "numpy"],
    desc: "视频制作引擎"
  },
  "video-enhancer": {
    packages: ["opencv-python", "numpy", "pillow"],
    desc: "视频增强引擎"
  },
};

export async function installPipPackages(
  toolSlug: string,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  const req = REQUIRED_PACKAGES[toolSlug];
  if (!req || req.packages.length === 0) return true;

  const status = detectPython();
  if (!status.installed || !status.path) return false;

  for (const pkg of req.packages) {
    onProgress?.(`安装 ${pkg}…`);
    try {
      execSync(`"${status.path}" -m pip install ${pkg} -q`, { stdio: "pipe", timeout: 300000 });
    } catch (e: any) {
      onProgress?.(`${pkg} 安装失败: ${e.message}`);
      return false;
    }
  }

  onProgress?.("依赖安装完成！");
  return true;
}

export { PYTHON_DIR, PYTHON_EXE, REQUIRED_PACKAGES };
