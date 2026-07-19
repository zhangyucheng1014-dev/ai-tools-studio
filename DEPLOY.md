# AI 工具台桌面版 — 构建指南

## 一键打包 EXE

```bash
npm install
npm run dist
```

输出：`release/AI工具台-Setup-2.0.0.exe`

## 工作原理

- **首次启动**：WebLLM 自动从 CDN 下载 AI 模型（~1.5GB），静默后台下载，存入本地缓存
- **之后使用**：完全离线，模型从本地缓存加载，零网络请求
- **下载期间**：快速引擎（light-engine）即时响应，不阻塞使用

## 可选：预下载模型

如果想把模型也打进 EXE（EXE 会变大 ~1.5GB）：

```bash
npm run download-models   # 提前下载模型到 models/
npm run dist              # 打包时会包含 models/ 目录
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面壳 | Electron 39 |
| 前端 | Next.js 16 (静态导出) |
| AI 推理 | @mlc-ai/web-llm (Qwen 2.5 1.5B) |
| TTS 配音 | Web Speech API |
| STT 识别 | Web Speech API |
| 数字人 | Three.js 3D 引擎 |
| 视频处理 | Canvas API + MediaRecorder |
| 外部引擎 | 可选 Python 服务（一键检测安装） |
