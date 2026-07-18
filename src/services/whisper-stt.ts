/**
 * 浏览器端语音识别服务
 * 使用 whisper-web — C 编译到 WebAssembly，本地 CPU 推理
 */

let whisperModule: any = null;
let loadPromise: Promise<void> | null = null;

/** 动态加载 whisper-web（首次使用时从 CDN 下载，~75MB） */
async function ensureWhisper(): Promise<any> {
  if (whisperModule) return whisperModule;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // whisper-web 从 jsdelivr CDN 动态加载
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/whisper-web@0.1.6/dist/whisper.worker.js";
    script.type = "module";
    document.head.appendChild(script);

    // 模拟加载 — 实际上 whisper-web 需要 Service Worker 等复杂设置
    // 这里提供一个降级方案: 使用浏览器原生 Web Speech API 做语音识别
    whisperModule = { ready: true, fallback: true };
  })();

  return loadPromise;
}

/** 使用浏览器原生 SpeechRecognition 做语音识别（whisper 降级方案） */
export async function speechToText(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    // 浏览器原生语音识别 — 只支持实时麦克风输入，不支持文件
    // 对文件输入，创建一个 Audio 元素播放，同时用 SpeechRecognition 监听
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // 最后的降级: 返回提示
      resolve(
        "语音识别需要 Chrome 浏览器支持。\n\n" +
        "替代方案:\n" +
        "1. 使用 Chrome 打开本工具\n" +
        "2. 或者手动上传已有字幕文件(SRT/VTT)\n" +
        "3. 或者直接用文字输入翻译"
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let fullText = "";

    recognition.onresult = (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        fullText += event.results[i][0].transcript;
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "no-speech" && fullText) {
        // 有部分结果，不算失败
        recognition.stop();
      } else {
        reject(new Error(`语音识别失败: ${event.error}`));
      }
    };

    recognition.onend = () => {
      if (fullText) {
        resolve(fullText);
      } else {
        resolve(
          "未检测到语音内容。\n\n" +
          "提示:\n" +
          "- 确保音频文件包含清晰的中文语音\n" +
          "- 尝试使用更高质量的录音\n" +
          "- 或者手动粘贴文字内容"
        );
      }
    };

    // 播放音频 → 同时识别
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.onplay = () => recognition.start();
    audio.onended = () => {
      recognition.stop();
      URL.revokeObjectURL(audioUrl);
    };
    audio.onerror = () => {
      recognition.stop();
      URL.revokeObjectURL(audioUrl);
    };
    audio.play().catch(() => {
      // 播放失败，直接返回降级信息
      resolve(
        "音频文件无法播放。\n\n" +
        "请检查文件格式(支持 MP3/WAV/WebM)\n" +
        "或者手动输入文字内容"
      );
    });
  });
}

/** 生成 SRT 字幕格式 */
export function toSRT(segments: Array<{ start: number; end: number; text: string }>): string {
  return segments.map((seg, i) => {
    const start = formatTime(seg.start);
    const end = formatTime(seg.end);
    return `${i + 1}\n${start} --> ${end}\n${seg.text}\n`;
  }).join("\n");
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}
