/**
 * 浏览器端 AI — WebLLM + Qwen 1.5B
 */
import { CreateMLCEngine } from "@mlc-ai/web-llm";
import { systemPrompts } from "@/config/prompts";

const MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let engine: any = null;
let loadPromise: Promise<void> | null = null;
let loadProgress = 0;
let onProgressCb: ((p: number) => void) | null = null;

export function getLoadProgress() { return loadProgress; }
export function isLoaded() { return engine !== null; }
export function isLoading() { return loadPromise !== null && !engine; }
export function onLoadProgress(cb: (p: number) => void) { onProgressCb = cb; }

export async function ensureEngine(): Promise<void> {
  if (engine) return;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    engine = await CreateMLCEngine(MODEL, {
      initProgressCallback: (r: { progress: number }) => {
        loadProgress = r.progress;
        onProgressCb?.(loadProgress);
      }
    });
  })();
  await loadPromise;
}

async function chat(system: string, user: string, temp = 0.7): Promise<string> {
  await ensureEngine();
  const reply = await engine.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    temperature: temp,
    max_tokens: 2048
  });
  return reply.choices[0].message.content ?? "";
}

export async function rewriteContent(content: string, style: string) {
  return chat(systemPrompts["content-rewriter"] ?? "", `改写风格: ${style}\n\n原文:\n${content}\n\n改写结果:`, 0.7);
}

export async function translateSubtitles(text: string, sourceLang: string, targetLang: string) {
  return chat(systemPrompts["subtitle-generator"] ?? "", `源语言: ${sourceLang}\n目标语言: ${targetLang}\n\n原文:\n${text}\n\n翻译结果:`, 0.3);
}

export async function generateScript(topic: string) {
  return chat(systemPrompts["video-factory"] ?? "", `主题: ${topic}\n\n脚本:`, 0.8);
}

export async function generateSocialCopy(title: string, platforms: string) {
  return chat("你是社交媒体运营专家。", `视频: ${title}\n平台: ${platforms}\n\n标题+文案+话题:`, 0.7);
}

export function preloadModel() { ensureEngine().catch(() => {}); }
