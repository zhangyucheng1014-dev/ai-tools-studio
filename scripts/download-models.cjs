/**
 * 模型下载脚本 — 将 WebLLM 模型下载到本地 models/ 目录
 * 运行: node scripts/download-models.cjs
 */
const https = require("https");
const fs = require("fs");
const path = require("path");

const MODEL_ID = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const MODELS_DIR = path.join(__dirname, "..", "models", MODEL_ID);
const HF_BASE = `https://huggingface.co/mlc-ai/${MODEL_ID}/resolve/main/`;

// 模型文件清单
const FILES = [
  "mlc-chat-config.json",
  "ndarray-cache.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "config.json",
];

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { "User-Agent": "AI-Tools-Studio/2.0" } }, (res) => {
      if (res.statusCode === 302) { file.close(); fs.unlinkSync(dest); return downloadFile(res.headers.location, dest).then(resolve).catch(reject); }
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(dest); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const total = parseInt(res.headers["content-length"] || "0", 10);
      let downloaded = 0;
      res.on("data", (chunk) => { downloaded += chunk.length; if (total) process.stdout.write(`\r  ${((downloaded / total) * 100).toFixed(1)}%`); });
      res.pipe(file);
      file.on("finish", () => { file.close(); process.stdout.write("\n"); resolve(); });
      file.on("error", reject);
    }).on("error", reject);
  });
}

async function main() {
  if (fs.existsSync(path.join(MODELS_DIR, "mlc-chat-config.json"))) {
    console.log(`✅ 模型 ${MODEL_ID} 已下载，跳过。`);
    return;
  }

  console.log(`📦 下载模型: ${MODEL_ID}`);
  console.log(`   目标目录: ${MODELS_DIR}\n`);
  fs.mkdirSync(MODELS_DIR, { recursive: true });

  // 1. 获取文件列表 (HuggingFace API)
  console.log("🔍 获取文件列表…");
  const listUrl = `https://huggingface.co/api/models/mlc-ai/${MODEL_ID}`;
  const listData = await new Promise((resolve, reject) => {
    https.get(listUrl, { headers: { "User-Agent": "AI-Tools-Studio/2.0" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
      res.on("error", reject);
    }).on("error", reject);
  });

  const siblings = listData.siblings || [];
  const allFiles = siblings.map((s) => s.rfilename);

  console.log(`   发现 ${allFiles.length} 个文件\n`);

  // 2. 下载所有文件
  for (const file of allFiles) {
    const dest = path.join(MODELS_DIR, path.basename(file));
    const url = HF_BASE + file;
    console.log(`⬇  ${file}`);
    try {
      await downloadFile(url, dest);
    } catch (e) {
      console.error(`   ❌ 失败: ${e.message}`);
    }
  }

  console.log(`\n✅ 模型下载完成！共 ${allFiles.length} 个文件 → ${MODELS_DIR}`);
}

main().catch((e) => {
  console.error("❌ 下载失败:", e.message);
  console.log("💡 提示: 可以手动从 HuggingFace 下载模型文件放到 models/ 目录");
  process.exit(1);
});
