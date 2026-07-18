/**
 * 浏览器端视频合成
 * Canvas + MediaRecorder → 图文配音短视频
 */

import { speakToBlob } from "./browser-tts";

export async function composeVideo(
  script: string,
  bgmStyle: string,
  subtitleStyle: string,
  aspectRatio: string,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  onProgress?.("正在生成配音…");

  let audioBlob: Blob;
  try {
    audioBlob = await speakToBlob(script);
  } catch {
    return null;
  }

  onProgress?.("正在合成视频…");

  const sizes: Record<string, [number, number]> = {
    "9:16（竖屏）": [720, 1280],
    "16:9（横屏）": [1280, 720],
    "1:1（方形）": [720, 720],
  };
  const [width, height] = sizes[aspectRatio] ?? [720, 1280];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const audioCtx = new AudioContext();
  const audioSrc = await audioCtx.decodeAudioData(await audioBlob.arrayBuffer());
  const duration = audioSrc.duration;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  const audioEl = new Audio(URL.createObjectURL(audioBlob));
  const sentences = script.split(/[。！？\n]/).filter(Boolean);

  // BGM 风格对应的颜色
  const themes: Record<string, { bg: string; text: string; accent: string }> = {
    "轻快": { bg: "#667eea", text: "#ffffff", accent: "#f9d423" },
    "平静": { bg: "#0f2027", text: "#ffffff", accent: "#2c5364" },
    "激昂": { bg: "#cb2d3e", text: "#ffffff", accent: "#ef473a" },
    "励志": { bg: "#1a2980", text: "#ffffff", accent: "#26d0ce" },
    "无 BGM": { bg: "#1a1a2e", text: "#ffffff", accent: "#e94560" },
  };
  const theme = themes[bgmStyle] ?? themes["轻快"];

  let startTime = 0;

  function draw() {
    const t = (Date.now() - startTime) / 1000;
    if (t > duration) {
      recorder.stop();
      audioEl.pause();
      return;
    }

    const progress = t / duration;
    const currentSentenceIndex = Math.floor(progress * sentences.length);
    const currentSentence = sentences[currentSentenceIndex] ?? "";

    ctx.clearRect(0, 0, width, height);

    // 背景渐变
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, theme.bg);
    gradient.addColorStop(1, theme.accent);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 装饰圆形
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.arc(width * 0.3, height * (0.4 + Math.sin(t * 0.5) * 0.1), width * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 字幕
    const fontSize = width * 0.06;
    ctx.font = subtitleStyle === "粗体" ? `bold ${fontSize}px sans-serif`
      : subtitleStyle === "简约" ? `${fontSize * 0.8}px sans-serif`
      : `${fontSize}px sans-serif`;
    ctx.fillStyle = theme.text;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;

    // 自动换行
    const maxWidth = width * 0.85;
    const words = currentSentence.split("");
    let line = "";
    const lines: string[] = [];
    for (const char of words) {
      const testLine = line + char;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    const lineHeight = fontSize * 1.6;
    const startY = height * 0.55 - (lines.length * lineHeight) / 2;
    lines.forEach((l, i) => {
      ctx.fillText(l, width / 2, startY + i * lineHeight);
    });

    ctx.shadowBlur = 0;

    // 进度条
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(0, height - 4, width, 4);
    ctx.fillStyle = theme.accent;
    ctx.fillRect(0, height - 4, width * progress, 4);

    if (!recorder || recorder.state === "recording") {
      requestAnimationFrame(draw);
    }
  }

  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };
    recorder.start();
    startTime = Date.now();
    audioEl.play();
    draw();
  });
}
