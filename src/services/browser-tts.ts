/**
 * 浏览器端 TTS 配音服务
 * 使用 Web Speech API (SpeechSynthesis)，零下载即时可用
 */

export type TTSVoice = {
  name: string;
  lang: string;
  gender: "male" | "female" | "neutral";
};

/** 获取可用的中文语音列表 */
export function getChineseVoices(): TTSVoice[] {
  const voices = speechSynthesis.getVoices();
  return voices
    .filter(v => v.lang.startsWith("zh"))
    .map(v => ({
      name: v.name,
      lang: v.lang,
      gender: v.name.includes("Female") || v.name.includes("女") ? "female" as const
        : v.name.includes("Male") || v.name.includes("男") ? "male" as const
        : "neutral" as const
    }));
}

/** 将文字转成语音并返回音频 Blob */
export async function speakToBlob(
  text: string,
  voiceName?: string,
  rate = 1.0,
  pitch = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const mediaRecorder = new MediaRecorder(dest.stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
      audioCtx.close();
      resolve(blob);
    };

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();

    if (voiceName) {
      const found = voices.find(v => v.name === voiceName);
      if (found) utterance.voice = found;
    } else {
      // 默认选第一个中文语音
      const zhVoice = voices.find(v => v.lang.startsWith("zh-CN"))
        ?? voices.find(v => v.lang.startsWith("zh"));
      if (zhVoice) utterance.voice = zhVoice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    utterance.onstart = () => mediaRecorder.start();
    utterance.onend = () => mediaRecorder.stop();
    utterance.onerror = (e) => {
      mediaRecorder.stop();
      reject(e);
    };

    speechSynthesis.speak(utterance);
  });
}

/** 纯播放，不录音 */
export function speakPreview(text: string, voiceName?: string, rate = 1.0): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  if (voiceName) {
    const found = voices.find(v => v.name === voiceName);
    if (found) utterance.voice = found;
  }
  utterance.rate = rate;
  speechSynthesis.speak(utterance);
}

/** 播放音频 Blob */
export function playBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  audio.play();
}

/** 下载 Blob 为文件 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
