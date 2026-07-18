"""
AI 工具台 — 本地工具包装服务
每个开源工具一个 Flask 端点，保留原版参数
启动: python services/tool-wrappers.py
"""

import sys, os, json, subprocess, tempfile, shutil
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from threading import Thread

app = Flask(__name__)

# ── 1. 视频下载 — TikTokDownloader ──────────────────────────

@app.route("/api/ttk/download", methods=["POST"])
def ttk_download():
    """TikTokDownloader 原生 CLI 包装"""
    data = request.get_json(force=True, silent=True) or {}
    url = data.get("url", "").strip()
    quality = data.get("quality", "1080p")

    if not url:
        return jsonify({"ok": False, "error": "请提供视频链接"}), 400

    ttk_dir = "/tmp/TikTokDownloader"
    if not os.path.isdir(ttk_dir):
        return jsonify({"ok": False, "error": "TikTokDownloader 未安装", "hint": "git clone https://github.com/JoeanAmier/TikTokDownloader /tmp/TikTokDownloader"}), 503

    try:
        result = subprocess.run(
            [sys.executable, "main.py"],
            cwd=ttk_dir,
            input=url + "\n",
            capture_output=True, text=True, timeout=120
        )
        return jsonify({
            "ok": True,
            "output": result.stdout or "下载任务已提交",
            "files": result.stderr or ""
        })
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "下载超时"}), 504
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 2. AI 配音 — GPT-SoVITS ──────────────────────────────────

@app.route("/api/gpt-sovits/tts", methods=["POST"])
def gpt_sovits_tts():
    """GPT-SoVITS 原生 API 包装"""
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "").strip()

    if not text:
        return jsonify({"ok": False, "error": "请提供配音文本"}), 400

    sovits_dir = "/tmp/GPT-SoVITS"
    if not os.path.isdir(sovits_dir):
        return jsonify({
            "ok": False,
            "error": "GPT-SoVITS 未安装",
            "hint": "git clone https://github.com/RVC-Boss/GPT-SoVITS /tmp/GPT-SoVITS"
        }), 503

    tmp = tempfile.mkdtemp()
    output = os.path.join(tmp, "output.wav")
    try:
        subprocess.run([
            sys.executable, "api.py",
            "--text", text,
            "--output", output,
            "--language", data.get("language", "zh"),
            "--speed", str(data.get("speed", 1.0))
        ], cwd=sovits_dir, capture_output=True, text=True, timeout=120)
        if os.path.exists(output):
            return send_file(output, mimetype="audio/wav")
        return jsonify({"ok": False, "error": "生成失败"}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "合成超时"}), 504

# ── 3. 数字人口播 — SadTalker ────────────────────────────────

@app.route("/api/sadtalker/generate", methods=["POST"])
def sadtalker_generate():
    """SadTalker 原生 CLI 包装"""
    photo = request.files.get("photo")
    audio = request.files.get("audio")
    if not photo or not audio:
        return jsonify({"ok": False, "error": "需要 photo 和 audio"}), 400

    sadtalker_dir = "/tmp/SadTalker"
    if not os.path.isdir(sadtalker_dir):
        return jsonify({
            "ok": False,
            "error": "SadTalker 未安装",
            "hint": "git clone https://github.com/OpenTalker/SadTalker /tmp/SadTalker"
        }), 503

    tmp = tempfile.mkdtemp()
    photo_path = os.path.join(tmp, "photo.png")
    audio_path = os.path.join(tmp, "audio.wav")
    photo.save(photo_path)
    audio.save(audio_path)

    try:
        subprocess.run([
            sys.executable, "inference.py",
            "--source_image", photo_path,
            "--driven_audio", audio_path,
            "--preprocess", request.form.get("preprocess", "full_crop"),
            "--size", request.form.get("size", "256"),
            "--result_dir", os.path.join(tmp, "output")
        ], cwd=sadtalker_dir, capture_output=True, text=True, timeout=300)

        videos = list(Path(tmp).rglob("*.mp4"))
        if videos:
            return send_file(str(videos[0]), mimetype="video/mp4")
        return jsonify({"ok": False, "error": "未生成视频"}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "生成超时（5分钟）"}), 504

# ── 4. 多平台发布 — social-auto-upload ───────────────────────

@app.route("/api/social-upload/publish", methods=["POST"])
def social_upload_publish():
    """social-auto-upload 原生 CLI 包装"""
    data = request.get_json(force=True, silent=True) or {}
    video_path = data.get("video_path", "").strip()

    if not video_path:
        return jsonify({"ok": False, "error": "请提供视频文件路径"}), 400

    sau_dir = "/tmp/social-auto-upload"
    if not os.path.isdir(sau_dir):
        return jsonify({
            "ok": False,
            "error": "social-auto-upload 未安装",
            "hint": "git clone https://github.com/dreammis/social-auto-upload /tmp/social-auto-upload"
        }), 503

    try:
        result = subprocess.run([
            sys.executable, "sau_cli.py", "upload",
            "--video", video_path,
            "--title", data.get("title", ""),
            "--platforms", data.get("platforms", "douyin"),
        ], cwd=sau_dir, capture_output=True, text=True, timeout=120)
        return jsonify({"ok": True, "output": result.stdout or result.stderr})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 5. 健康检查 ──────────────────────────────────────────────

@app.route("/health")
def health():
    tools = {
        "TikTokDownloader": os.path.isdir("/tmp/TikTokDownloader"),
        "GPT-SoVITS": os.path.isdir("/tmp/GPT-SoVITS"),
        "SadTalker": os.path.isdir("/tmp/SadTalker"),
        "social-auto-upload": os.path.isdir("/tmp/social-auto-upload"),
    }
    return jsonify({"ok": True, "tools": tools})

# ── 启动 ──────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 50)
    for name in ["TikTokDownloader", "GPT-SoVITS", "SadTalker", "social-auto-upload"]:
        path = f"/tmp/{name}"
        print(f"  {'✅' if os.path.isdir(path) else '❌'} {name}")
    print("=" * 50)
    print("API 服务: http://localhost:8000")
    print("健康检查: http://localhost:8000/health")
    print("=" * 50)
    app.run(host="0.0.0.0", port=8000, debug=False)
