# AI 工具台桌面版 v2.0

## 一键打包

```bash
npm install
npm run dist
# → release/AI工具台-Setup-2.0.0.exe
```

## 集成的开源工具

| 工具 | 开源项目 | 方式 |
|------|----------|------|
| 视频下载 | [TikTokDownloader](https://github.com/JoeanAmier/TikTokDownloader) | 可选外部 Python 服务 |
| 文案改写 | WebLLM (Qwen 2.5 1.5B) | 内置，纯本地 |
| 数字人口播 | [HeyGem](https://github.com/GuijiAI/HeyGem.ai) | 可选外部 + 内置 3D 降级 |
| AI 配音 | [GPT-SoVITS](https://github.com/RVC-Boss/GPT-SoVITS) | 可选外部 + 浏览器 TTS 降级 |
| 字幕生成 | WebLLM + Speech API | 内置，纯本地 |
| 视频制作 | [MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 可选外部 Python 服务 |
| 视频增强 | Canvas API | 内置，纯本地 |
| 一键发布 | [social-auto-upload](https://github.com/dreammis/social-auto-upload) | 可选外部 Python 服务 |

## 外部引擎安装

首页 → "检测 & 安装外部引擎" → 一键检测 Python → 一键 clone + 启动服务

首次启动时 AI 模型自动静默下载（~1.5GB），下载期间轻量引擎即时可用，之后永久离线。
