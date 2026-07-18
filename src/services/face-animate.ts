/**
 * 数字人口播 — 浏览器端面部动画
 * 使用 Canvas + TTS 模拟照片在说话的效果
 */

import { speakToBlob } from "./browser-tts";

/** 生成口播视频 */
export async function generateTalkingVideo(
  photoUrl: string,
  script: string,
  aspectRatio: string,
  onProgress?: (msg: string) => void
): Promise<Blob | null> {
  onProgress?.("加载照片…");

  const img = new Image();
  img.crossOrigin = "anonymous";
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("照片加载失败"));
      img.src = photoUrl;
    });
  } catch {
    return null;
  }

  onProgress?.("生成配音…");
  const audioBlob = await speakToBlob(script);
  if (!audioBlob) return null;

  onProgress?.("合成视频…");
  const sizes: Record<string, [number, number]> = {
    "9:16（竖屏）": [720, 1280],
    "16:9（横屏）": [1280, 720],
    "2.35:1（电影宽幅）": [1280, 544],
  };
  const [width, height] = sizes[aspectRatio] ?? [720, 1280];

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  const audioEl = new Audio(URL.createObjectURL(audioBlob));
  let startTime = 0;

  return new Promise((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));

    function draw() {
      const t = (Date.now() - startTime) / 1000;
      if (t > audioEl.duration) { recorder.stop(); return; }

      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, width, height);

      // 照片居中，带微动
      const imgW = width * 0.85;
      const imgH = height * 0.75;
      const breathe = Math.sin(t * 1.3) * 2;
      const tiltX = Math.sin(t * 0.5) * 1;
      const mouthOpen = Math.abs(Math.sin(t * 7)) * 4;

      ctx.save();
      ctx.translate(width / 2 + tiltX, height / 2 + breathe);
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(-30, imgH / 2 - 10 + mouthOpen, 60, 12);
      ctx.restore();

      if (aspectRatio.includes("2.35")) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height * 0.12);
        ctx.fillRect(0, height * 0.88, width, height * 0.12);
      }

      requestAnimationFrame(draw);
    }

    recorder.start();
    startTime = Date.now();
    audioEl.play();
    draw();
  });
}
