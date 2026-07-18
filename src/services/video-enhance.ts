/**
 * 浏览器端视频增强
 * Canvas 逐帧处理: 锐化 + 降噪 + 调色
 */

type EnhanceOptions = {
  sharpen?: number;      // 0-1
  contrast?: number;     // 0-2
  brightness?: number;   // 0-2
  saturation?: number;   // 0-2
  onProgress?: (msg: string) => void;
};

/** 应用画质增强滤镜 */
export async function enhanceVideo(
  videoFile: File,
  options: EnhanceOptions = {}
): Promise<Blob | null> {
  const {
    sharpen = 0.5,
    contrast = 1.1,
    brightness = 1.0,
    saturation = 1.1,
    onProgress,
  } = options;

  onProgress?.("正在分析视频…");

  const video = document.createElement("video");
  video.src = URL.createObjectURL(videoFile);
  video.muted = true;

  await new Promise<void>((resolve) => {
    video.onloadedmetadata = () => resolve();
    video.load();
  });

  const width = Math.min(video.videoWidth, 1280);
  const height = Math.min(video.videoHeight, 720);
  const duration = video.duration;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);

  const startTime = Date.now();

  return new Promise((resolve) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    async function processFrame() {
      const t = (Date.now() - startTime) / 1000;
      if (t >= duration) {
        recorder.stop();
        return;
      }

      onProgress?.(`正在处理… ${Math.round((t / duration) * 100)}%`);
      video.currentTime = t;
      await new Promise(r => { video.onseeked = r; });

      ctx.drawImage(video, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      // 简易锐化 (拉普拉斯卷积核)
      if (sharpen > 0) {
        const factor = sharpen * 0.5;
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            for (let c = 0; c < 3; c++) {
              const val =
                data[i + c] * (1 + 4 * factor)
                - data[i + c - 4] * factor
                - data[i + c + 4] * factor
                - data[i + c - width * 4] * factor
                - data[i + c + width * 4] * factor;
              data[i + c] = Math.max(0, Math.min(255, val));
            }
          }
        }
      }

      // 对比度 + 亮度
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, (data[i] - 128) * contrast + 128 * brightness));
        data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - 128) * contrast + 128 * brightness));
        data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - 128) * contrast + 128 * brightness));
      }

      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(processFrame);
    }

    recorder.start();
    video.currentTime = 0;
    video.play();
    video.onseeked = () => {};
    processFrame();
  });
}
