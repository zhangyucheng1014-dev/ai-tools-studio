# AI 工具台 — 部署指南

## 方案：本地运行 + Vercel 前端

不需要 GPU 服务器。每个 AI 工具安装在你的电脑上，前端部署到 Vercel（免费）。

---

## 一、前端部署（2 分钟）

### Vercel 一键部署
1. 打开 https://vercel.com
2. 用 GitHub 登录
3. 点击 "Import Project" → 选择 `ai-tools-studio`
4. 框架自动识别为 Next.js → 直接点 "Deploy"
5. 获得公网地址如 `https://ai-tools-studio.vercel.app`

### 配置环境变量
在 Vercel 项目 Settings → Environment Variables 中填入各服务地址

---

## 二、7 个工具的本地安装

### 1. 视频下载 — TikTokDownloader
```bash
git clone https://github.com/JoeanAmier/TikTokDownloader
cd TikTokDownloader
pip install -r requirements.txt
python main.py
# 启动后暴露 API → 写入 .env: TIKTOK_DOWNLOADER_ENDPOINT=http://localhost:8001
```

### 2. 文案改写 — 无需安装
直接调用 OpenAI 兼容接口，填 API Key 即可：
```
OPENAI_BASE_URL=https://api.openai.com
OPENAI_API_KEY=sk-xxx
```

### 3. 数字人 — HeyGem
下载桌面版：https://github.com/GuijiAI/HeyGem.ai/releases
安装后启动本地服务 → `HEYGEM_ENDPOINT=http://localhost:8002`

### 4. AI 配音 — GPT-SoVITS
```bash
git clone https://github.com/RVC-Boss/GPT-SoVITS
cd GPT-SoVITS
pip install -r requirements.txt
python webui.py
# → GPT_SOVITS_ENDPOINT=http://localhost:8003
```

### 5. 视频制作 — MoneyPrinterTurbo
```bash
git clone https://github.com/harry0703/MoneyPrinterTurbo
cd MoneyPrinterTurbo
pip install -r requirements.txt
python main.py
# → MONEY_PRINTER_ENDPOINT=http://localhost:8005
```

### 6. 视频增强 — Real-ESRGAN
```bash
git clone https://github.com/xinntao/Real-ESRGAN
cd Real-ESRGAN
pip install -r requirements.txt
python inference_realesrgan.py
# → VIDEO_ENHANCER_ENDPOINT=http://localhost:8006
```

### 7. 多平台发布 — social-auto-upload
```bash
git clone https://github.com/dreammis/social-auto-upload
cd social-auto-upload
pip install -r requirements.txt
python main.py
# → SOCIAL_UPLOAD_ENDPOINT=http://localhost:8007
```

---

## 三、使用流程

1. 在你的电脑上安装需要的 AI 工具
2. 启动工具 → 记下本地地址
3. 在 Vercel 环境变量或本地 `.env` 中填入地址
4. 访问前端 → 选择工具 → 上传文件/输入内容 → 运行

**没安装某工具？** 没关系——前端会自动降级为 Mock 演示模式，不会报错。
