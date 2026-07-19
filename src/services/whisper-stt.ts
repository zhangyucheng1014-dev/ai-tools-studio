/**
 * 桌面版语音识别服务
 * 使用浏览器原生 SpeechRecognition API（Electron/Chrome 内置）
 * 无需下载，即时可用
 */

/** 使用浏览器原生 SpeechRecognition 做语音识别 */
export async function speechToText(audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      resolve(
        "语音识别需要 Chromium 内核支持（桌面版已内置）。\n\n" +
        "替代方案:\n" +
        "1. 手动上传已有字幕文件(SRT/VTT)\n" +
        "2. 直接用文字输入翻译"
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
