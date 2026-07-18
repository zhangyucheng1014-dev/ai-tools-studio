#!/bin/bash
# AI 工具台 — 启动所有本地工具服务
# 使用方法: bash services/start-tools.sh

echo "========================================="
echo "AI 工具台 — 启动本地工具服务"
echo "========================================="

cd "$(dirname "$0")/.."

# 安装依赖
echo "[1/3] 安装 Python 依赖…"
pip install flask flask-cors --break-system-packages -q 2>/dev/null
echo "  ✅ Flask 就绪"

# TikTokDownloader
echo "[2/3] TikTokDownloader…"
if [ -d "/tmp/TikTokDownloader" ]; then
  echo "  ✅ 已安装"
else
  echo "  ⚠️ 未找到，跳过"
fi

# social-auto-upload
echo "[3/3] social-auto-upload…"
if [ -d "/tmp/social-auto-upload" ]; then
  echo "  ✅ 已安装"
else
  echo "  ⚠️ 未找到，跳过"
fi

echo "========================================="
echo "启动服务中…"
echo "========================================="

python services/tool-wrappers.py
