/**
 * Python 环境管理器 — 检测/安装 Python + pip 包
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");

const PYTHON_DIR = path.join(os.homedir(), ".ai-tools-studio", "python");
const PYTHON_EXE = process.platform === "win32"
  ? path.join(PYTHON_DIR, "python.exe")
  : path.join(PYTHON_DIR, "bin", "python3");

const REQUIRED_PACKAGES = {
  "video-downloader": { packages: [], desc: "TikTokDownloader" },
  "digital-human": { packages: [], desc: "HeyGem" },
  "ai-voice": { packages: ["numpy", "scipy", "soundfile", "torch", "transformers"], desc: "GPT-SoVITS" },
  "video-factory": { packages: ["moviepy", "pillow", "numpy"], desc: "MoneyPrinterTurbo" },
  "multi-platform-publish": { packages: [], desc: "social-auto-upload" },
};

function detectPython() {
  if (fs.existsSync(PYTHON_EXE)) {
    try {
      const out = execSync('"' + PYTHON_EXE + '" --version', { encoding: "utf-8" });
      return { installed: true, version: out.trim(), path: PYTHON_EXE, pipPackages: listPip(PYTHON_EXE) };
    } catch (_) {}
  }

  const cmds = process.platform === "win32" ? ["python", "python3", "py -3"] : ["python3", "python"];
  for (const cmd of cmds) {
    try {
      const out = execSync(cmd + " --version 2>&1", { encoding: "utf-8", shell: true });
      if (out.includes("Python")) {
        const pyPath = cmd.split(" ")[0];
        const realPath = findSysPython(pyPath);
        return { installed: true, version: out.trim(), path: realPath || pyPath, pipPackages: listPip(realPath || pyPath) };
      }
    } catch (_) {}
  }
  return { installed: false, version: null, path: null, pipPackages: [] };
}

function findSysPython(cmd) {
  try {
    const out = process.platform === "win32"
      ? execSync("where " + cmd, { encoding: "utf-8" })
      : execSync("which " + cmd, { encoding: "utf-8" });
    return out.split("\n")[0].trim() || null;
  } catch (_) { return null; }
}

function listPip(pyPath) {
  try {
    const out = execSync('"' + pyPath + '" -m pip list --format=freeze 2>/dev/null', { encoding: "utf-8", timeout: 10000 });
    return out.split("\n").filter(Boolean).map(l => l.split("==")[0].toLowerCase());
  } catch (_) { return []; }
}

async function installPython(onProgress) {
  if (process.platform !== "win32") {
    if (onProgress) onProgress("非 Windows 系统，请手动安装 Python 3.10+");
    return false;
  }

  if (onProgress) onProgress("正在下载 Python 3.10…");
  fs.mkdirSync(PYTHON_DIR, { recursive: true });

  const zipUrl = "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip";
  const zipPath = path.join(PYTHON_DIR, "python.zip");

  try {
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(zipPath);
      https.get(zipUrl, (res) => {
        if (res.statusCode === 302) { https.get(res.headers.location, (r2) => r2.pipe(file)); return; }
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", reject);
      }).on("error", reject);
    });

    if (onProgress) onProgress("正在解压…");
    execSync('powershell -Command "Expand-Archive -Path \'' + zipPath + '\' -DestinationPath \'' + PYTHON_DIR + '\' -Force"');
    fs.unlinkSync(zipPath);

    const pthFile = path.join(PYTHON_DIR, "python310._pth");
    if (fs.existsSync(pthFile)) {
      let content = fs.readFileSync(pthFile, "utf-8");
      content = content.replace("#import site", "import site");
      fs.writeFileSync(pthFile, content);
    }

    if (onProgress) onProgress("正在安装 pip…");
    execSync('"' + PYTHON_EXE + '" -m ensurepip', { stdio: "pipe" });

    if (onProgress) onProgress("Python 安装完成！");
    return true;
  } catch (e) {
    if (onProgress) onProgress("安装失败: " + e.message);
    return false;
  }
}

async function installPipPackages(toolSlug, onProgress) {
  const req = REQUIRED_PACKAGES[toolSlug];
  if (!req || req.packages.length === 0) return true;

  const status = detectPython();
  if (!status.installed || !status.path) return false;

  for (const pkg of req.packages) {
    if (onProgress) onProgress("安装 " + pkg + "…");
    try {
      execSync('"' + status.path + '" -m pip install ' + pkg + ' -q', { stdio: "pipe", timeout: 300000 });
    } catch (e) {
      if (onProgress) onProgress(pkg + " 安装失败: " + e.message);
      return false;
    }
  }
  if (onProgress) onProgress("依赖安装完成！");
  return true;
}

module.exports = { detectPython, installPython, installPipPackages, PYTHON_DIR, PYTHON_EXE, REQUIRED_PACKAGES };
