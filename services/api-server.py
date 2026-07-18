"""
AI 工具台 — 开源工具统一 API 服务
每个工具保留原版配置参数，原汁原味
启动: python services/api-server.py
"""

from flask import Flask, request, jsonify, send_file
import subprocess, os, tempfile, base64, json
from pathlib import Path

app = Flask(__name__)

# ── 工具路径配置 ──────────────────────────────────────────────
TOOLS = {
    "sadtalker":    "/tmp/SadTalker",
    "gpt_sovits":   "/tmp/GPT-SoVITS",
    "ttk":          "/tmp/TikTokDownloader",
    "real_esrgan":  "/tmp/Real-ESRGAN",
    "money_printer": "/tmp/MoneyPrinterTurbo",
    "social_upload": "/tmp/social-auto-upload",
}

# ── 1. 数字人口播 — SadTalker（原版参数） ────────────────────

@app.route("/api/sadtalker/generate", methods=["POST"])
def sadtalker_generate():
    """
    参数（全为 SadTalker 原生配置）:
      - photo: 照片文件 (multipart)
      - audio: 音频文件 (multipart)
      - preprocess: full_crop | extcrop | resize | pad  (默认 full_crop)
      - still: True | False (减少头部运动)
      - enhancer: gfpgan | CodeFormer | None (面部增强)
      - pose_style: 0-255 (头部姿态变化程度)
      - size: 256 | 512 (输出分辨率)
    """
    photo = request.files.get("photo")
    audio = request.files.get("audio")
    if not photo or not audio:
        return jsonify({"ok": False, "error": "需要 photo 和 audio"}), 400

    # 保存临时文件
    tmp = tempfile.mkdtemp()
    photo_path = os.path.join(tmp, "photo.png")
    audio_path = os.path.join(tmp, "audio.wav")
    photo.save(photo_path)
    audio.save(audio_path)

    # 读取配置 — 全部使用 SadTalker 原生参数名
    preprocess = request.form.get("preprocess", "full_crop")
    still = request.form.get("still", "False")
    enhancer = request.form.get("enhancer", "gfpgan")
    pose_style = request.form.get("pose_style", "0")
    size = request.form.get("size", "256")

    cmd = [
        "python", f"{TOOLS['sadtalker']}/inference.py",
        "--source_image", photo_path,
        "--driven_audio", audio_path,
        "--preprocess", preprocess,
        "--enhancer", enhancer,
        "--pose_style", pose_style,
        "--size", size,
        "--result_dir", tmp + "/output",
    ]
    if still == "True":
        cmd.append("--still")

    try:
        subprocess.run(cmd, check=True, timeout=300, capture_output=True, text=True)
        # 找到生成的视频
        output_dir = Path(tmp) / "output"
        videos = list(output_dir.rglob("*.mp4"))
        if videos:
            return send_file(str(videos[0]), mimetype="video/mp4")
        return jsonify({"ok": False, "error": "生成失败，未找到输出视频"}), 500
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "处理超时（5分钟）"}), 504
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 2. AI 配音 — GPT-SoVITS（原版参数） ──────────────────────

@app.route("/api/gpt-sovits/tts", methods=["POST"])
def gpt_sovits_tts():
    """
    参数（GPT-SoVITS 原生配置）:
      - text: 要合成的文字
      - ref_audio: 参考音频（音色克隆源）
      - ref_text: 参考音频对应的文字
      - language: zh | en | ja
      - speed: 0.5-2.0
    """
    data = request.get_json(force=True, silent=True) or {}
    text = data.get("text", "")
    if not text:
        return jsonify({"ok": False, "error": "需要 text 参数"}), 400

    # GPT-SoVITS 原生参数
    ref_audio = data.get("ref_audio", "")  # 参考音频路径
    ref_text = data.get("ref_text", "")    # 参考音频文字
    language = data.get("language", "zh")
    speed = data.get("speed", 1.0)

    tmp = tempfile.mkdtemp()
    output_path = os.path.join(tmp, "output.wav")

    # 如果有参考音频 → 音色克隆模式
    # 如果没有 → 用默认音色
    cmd = [
        "python", f"{TOOLS['gpt_sovits']}/api.py",
        "--text", text,
        "--output", output_path,
        "--language", language,
        "--speed", str(speed),
    ]
    if ref_audio:
        cmd += ["--ref_audio", ref_audio]
    if ref_text:
        cmd += ["--ref_text", ref_text]

    try:
        subprocess.run(cmd, check=True, timeout=120, capture_output=True, text=True)
        return send_file(output_path, mimetype="audio/wav")
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "合成超时"}), 504
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 3. 视频下载 — TikTokDownloader ────────────────────────────

@app.route("/api/ttk/download", methods=["POST"])
def ttk_download():
    data = request.get_json(force=True, silent=True) or {}
    url = data.get("url", "")
    quality = data.get("quality", "1080p")
    extract_subtitle = data.get("extract_subtitle", False)

    if not url:
        return jsonify({"ok": False, "error": "需要视频链接"}), 400

    cmd = [
        "python", f"{TOOLS['ttk']}/main.py",
        "--url", url,
        "--quality", quality,
    ]
    if extract_subtitle:
        cmd.append("--extract-subtitle")

    try:
        result = subprocess.run(cmd, check=True, timeout=120, capture_output=True, text=True)
        return jsonify({"ok": True, "output": result.stdout})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 4. 视频增强 — Real-ESRGAN ─────────────────────────────────

@app.route("/api/real-esrgan/enhance", methods=["POST"])
def real_esrgan_enhance():
    video = request.files.get("video")
    if not video:
        return jsonify({"ok": False, "error": "需要 video 文件"}), 400

    scale = request.form.get("scale", "4")  # Real-ESRGAN 原生: 2|3|4
    model = request.form.get("model", "realesr-animevideov3")

    tmp = tempfile.mkdtemp()
    input_path = os.path.join(tmp, "input.mp4")
    output_path = os.path.join(tmp, "output.mp4")
    video.save(input_path)

    cmd = [
        "python", f"{TOOLS['real_esrgan']}/inference_realesrgan_video.py",
        "-i", input_path,
        "-o", output_path,
        "-s", scale,
        "-n", model,
    ]

    try:
        subprocess.run(cmd, check=True, timeout=600, capture_output=True, text=True)
        return send_file(output_path, mimetype="video/mp4")
    except subprocess.TimeoutExpired:
        return jsonify({"ok": False, "error": "增强超时（10分钟）"}), 504
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 5. 视频制作 — MoneyPrinterTurbo ────────────────────────────

@app.route("/api/money-printer/render", methods=["POST"])
def money_printer_render():
    data = request.get_json(force=True, silent=True) or {}
    script = data.get("script", "")
    title = data.get("title", "AI 短视频")
    bgm_style = data.get("bgm_style", "upbeat")
    subtitle_style = data.get("subtitle_style", "bold")
    aspect_ratio = data.get("aspect_ratio", "9:16")

    if not script:
        return jsonify({"ok": False, "error": "需要脚本"}), 400

    # MoneyPrinterTurbo 原生参数映射
    tmp = tempfile.mkdtemp()
    script_path = os.path.join(tmp, "script.txt")
    with open(script_path, "w") as f:
        f.write(script)

    cmd = [
        "python", f"{TOOLS['money_printer']}/main.py",
        "--script", script_path,
        "--title", title,
        "--bgm", bgm_style,
        "--subtitle", subtitle_style,
        "--aspect", aspect_ratio,
        "--output", tmp + "/output",
    ]

    try:
        subprocess.run(cmd, check=True, timeout=300, capture_output=True, text=True)
        videos = list(Path(tmp + "/output").rglob("*.mp4"))
        if videos:
            return send_file(str(videos[0]), mimetype="video/mp4")
        return jsonify({"ok": False, "error": "未找到输出视频"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 6. 多平台发布 — social-auto-upload ────────────────────────

@app.route("/api/social-upload/publish", methods=["POST"])
def social_upload_publish():
    data = request.get_json(force=True, silent=True) or {}
    video_path = data.get("video_path", "")
    title = data.get("title", "")
    platforms = data.get("platforms", ["douyin"])
    scheduled_at = data.get("scheduled_at", "")

    if not video_path:
        return jsonify({"ok": False, "error": "需要视频路径"}), 400

    cmd = [
        "python", f"{TOOLS['social_upload']}/main.py",
        "--video", video_path,
        "--title", title,
        "--platforms", ",".join(platforms),
    ]
    if scheduled_at:
        cmd += ["--schedule", scheduled_at]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        return jsonify({"ok": True, "output": result.stdout})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# ── 健康检查 ──────────────────────────────────────────────────

@app.route("/health")
def health():
    available = {}
    for name, path in TOOLS.items():
        available[name] = os.path.isdir(path)
    return jsonify({"ok": True, "tools": available})

if __name__ == "__main__":
    print("=" * 50)
    print("AI 工具台 — 开源工具 API 服务")
    print("=" * 50)
    for name, path in TOOLS.items():
        status = "✅" if os.path.isdir(path) else "❌"
        print(f"  {status} {name}: {path}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=8000, debug=False)
