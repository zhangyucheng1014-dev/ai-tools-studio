"use client";

import { Play, Settings2, WandSparkles, Upload, ArrowLeft, Volume2, Download, LoaderCircle } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui/base";
import { toolOptions, type FieldDef } from "@/config/tool-options";

// 浏览器端引擎
import { rewriteContent, translateSubtitles, generateScript, generateSocialCopy, isLoaded, isLoading } from "@/services/browser-ai";
import { quickRewrite, quickScript, quickSocialCopy } from "@/services/light-engine";
import { speakToBlob, downloadBlob, playBlob, getChineseVoices, type TTSVoice } from "@/services/browser-tts";
import { speechToText } from "@/services/whisper-stt";

type Props = {
  tool: { slug: string; name: string; inputs: string[]; fileBased?: boolean };
};

export function ToolRunner({ tool }: Props) {
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const fields: FieldDef[] = toolOptions[tool.slug] ?? [];
  const [options, setOptions] = useState<Record<string, string | number>>(() => {
    const d: Record<string, string | number> = {};
    for (const f of fields) {
      if (f.type !== "file" && f.defaultValue !== undefined) d[f.key] = f.defaultValue;
    }
    return d;
  });

  const hasFileField = fields.some(f => f.type === "file");
  const modelReady = isLoaded();
  const modelLoading = isLoading();

  // ── 引擎路由 ──────────────────────────────────────────────

  const run = useCallback(async () => {
    const hasText = prompt.trim();
    if (!hasText && !file) return;
    setLoading(true);
    setError(null);
    setOutput("");
    setAudioBlob(null);

    try {
      switch (tool.slug) {

        // ── 文案改写 ─────────────────────────────────
        case "content-rewriter": {
          const style = String(options.style ?? "通用");
          if (modelReady) {
            setOutput("AI 正在改写…");
            const result = await rewriteContent(prompt, style);
            setOutput(result);
          } else {
            setOutput("AI 模型加载中，先用快速引擎出稿…\n\n" + quickRewrite(prompt, style));
            if (!modelLoading) {
              // 触发加载
              import("@/services/browser-ai").then(m => m.preloadModel());
            }
          }
          break;
        }

        // ── AI 配音 ───────────────────────────────────
        case "ai-voice": {
          setOutput("正在生成语音…");
          // 优先用 GPT-SoVITS 原版
          let blob: Blob | null = null;
          try {
            const apiRes = await fetch("http://localhost:8000/api/gpt-sovits/tts", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({text:prompt,language:"zh",speed:Number(options.speed??1.0)}) });
            if(apiRes.ok){ blob=await apiRes.blob(); setOutput("✅ GPT-SoVITS 原版配音完成！"); }
          } catch {}
          if(!blob){ blob=await speakToBlob(prompt, String(options.voice??""), Number(options.speed??1.0)); setOutput("✅ 配音生成完成！（浏览器模式）"); }
          setAudioBlob(blob);
          break;
        }

        // ── 字幕生成 ─────────────────────────────────
        case "subtitle-generator": {
          if (file) {
            setOutput("正在识别语音…\n\n（首次使用可能较慢，请耐心等待）");
            const text = await speechToText(file);
            const targetLang = String(options.targetLanguage ?? "不翻译");
            if (targetLang !== "不翻译" && modelReady) {
              setOutput("正在翻译字幕…");
              const result = await translateSubtitles(text, String(options.sourceLanguage ?? "中文"), targetLang);
              setOutput(result);
            } else {
              setOutput(text);
            }
          } else if (prompt) {
            // 翻译已有字幕文本
            const targetLang = String(options.targetLanguage ?? "不翻译");
            if (modelReady) {
              setOutput("正在翻译…");
              const result = await translateSubtitles(prompt, String(options.sourceLanguage ?? "中文"), targetLang);
              setOutput(result);
            } else {
              setOutput("AI 模型加载中，请在模型就绪后重试。\n\n提示：上传音频文件可自动识别语音。");
            }
          }
          break;
        }

        // ── 视频脚本 / 视频制作 ──────────────────────
        case "video-factory": {
          if (modelReady) {
            setOutput("AI 正在生成视频脚本…");
            const result = await generateScript(prompt);
            setOutput(result);
          } else {
            setOutput("AI 模型加载中，先用快速引擎生成…\n\n" + quickScript(prompt));
            import("@/services/browser-ai").then(m => m.preloadModel());
          }
          break;
        }

        // ── 多平台发布 ─────────────────────────────────
        case "multi-platform-publish": {
          const platforms = String(options.platforms ?? "抖音");
          if (modelReady) {
            setOutput("正在生成各平台发布文案…");
            const result = await generateSocialCopy(prompt, platforms);
            setOutput(result);
          } else {
            setOutput("AI 模型加载中，快速生成基础文案…\n\n" + quickSocialCopy(prompt, platforms));
            import("@/services/browser-ai").then(m => m.preloadModel());
          }
          break;
        }

        // ── 数字人口播 ─────────────────────────────────
        case "digital-human": {
          if (file) {
            let videoBlob: Blob | null = null;
            // 优先用 SadTalker 原版
            try {
              setOutput("尝试 SadTalker 原版…");
              const voiceBlob = await speakToBlob(prompt||"你好");
              const fd = new FormData(); fd.append("photo",file); fd.append("audio",new File([voiceBlob],"audio.wav")); fd.append("size","256");
              const apiRes = await fetch("http://localhost:8000/api/sadtalker/generate",{method:"POST",body:fd});
              if(apiRes.ok){ videoBlob=await apiRes.blob(); setAudioBlob(videoBlob); setOutput("✅ SadTalker 原版生成完成！"); }
            } catch {}
            // 浏览器降级
            if(!videoBlob){
              setOutput("SadTalker 未安装，使用浏览器引擎…（建议安装原版获得更好效果）");
              const photoUrl = URL.createObjectURL(file);
              const aspect = String(options.aspectRatio ?? "9:16（竖屏）");
              const { generateTalkingVideo } = await import("@/services/face-animate");
              videoBlob = await generateTalkingVideo(photoUrl, prompt||"你好", aspect, (m)=>setOutput(m));
              URL.revokeObjectURL(photoUrl);
              if(videoBlob){ setAudioBlob(videoBlob); setOutput("✅ 口播视频生成完成！（浏览器模式）"); }
              else { setError("视频生成失败"); }
            }
          } else {
            setOutput("请上传一张正面照片，然后输入口播文案。");
          }
          break;
        }

        // ── 视频下载 ─────────────────────────────────
        case "video-downloader": {
          setOutput("正在解析视频链接…\n\n视频下载功能需要 TikTokDownloader 后端服务。\n当前为演示模式，请配置本地服务后使用。\n\n链接已记录: " + prompt);
          break;
        }

        // ── 视频增强 ─────────────────────────────────
        case "video-enhancer": {
          setOutput("视频增强功能需要 Real-ESRGAN 后端服务。\n当前为演示模式，请配置本地服务后使用。");
          break;
        }

        default:
          setOutput("该工具正在开发中…");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "运行失败");
    } finally {
      setLoading(false);
    }
  }, [prompt, options, file, tool.slug, modelReady, modelLoading]);

  // ── Render ──────────────────────────────────────────────

  const isVoice = tool.slug === "ai-voice";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
          <ArrowLeft size={16} /> 返回
        </Link>

        {/* 性能提示 */}
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          ⚠️ <strong>本地 AI 计算提示：</strong>视频生成和 AI 配音会大量占用 CPU/GPU，
          可能导致电脑发热、风扇狂转、短时卡顿。建议插电使用，关闭其他重负载应用。
        </div>

        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <WandSparkles size={16} /> 输入区域
          </div>

          {hasFileField && (
            <div className="mb-4">
              <input ref={fileRef} type="file"
                accept={fields.find(f => f.type === "file")?.accept ?? "*/*"}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-white/40 px-4 py-6 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Upload size={18} />
                {file ? <span className="text-[var(--fg)]">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span> : "点击上传文件"}
              </button>
            </div>
          )}

          {!tool.fileBased ? (
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder={`输入${tool.inputs.slice(0, 2).join("、")}…`}
              className="min-h-36 w-full resize-none rounded-lg border border-black/10 bg-white/80 p-4 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
            />
          ) : (
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="补充描述（选填）…"
              className="min-h-20 w-full resize-none rounded-lg border border-black/10 bg-white/80 p-4 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
            />
          )}

          <Button className="mt-4" onClick={run} disabled={loading || (!prompt.trim() && !file)}>
            {loading ? <><LoaderCircle size={14} className="animate-spin" /> 处理中…</>
              : <><Play size={14} /> 开始运行</>}
          </Button>
        </Card>

        {fields.filter(f => f.type !== "file").length > 0 && (
          <Card>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Settings2 size={14} /> 选项设置
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.filter(f => f.type !== "file").map(f => (
                <label key={f.key} className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--muted)]">{f.label}</span>
                  {f.type === "select" ? (
                    <select value={String(options[f.key] ?? f.defaultValue ?? "")}
                      onChange={e => setOptions(p => ({ ...p, [f.key]: e.target.value }))}
                      className="rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type === "number" ? "number" : "text"}
                      value={String(options[f.key] ?? f.defaultValue ?? "")}
                      onChange={e => setOptions(p => ({
                        ...p, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
                      }))}
                      placeholder={f.placeholder}
                      step={f.type === "number" ? "0.1" : undefined}
                      className="rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    />
                  )}
                </label>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* 输出区 */}
      <Card>
        <div className="mb-3 text-sm font-semibold">输出结果</div>

        {error ? (
          <div className="min-h-48 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">{error}</div>
        ) : output ? (
          <>
            <pre className="min-h-48 whitespace-pre-wrap rounded-lg border border-black/10 bg-[#121512] p-4 text-sm leading-7 text-[#e9f4ed]">{output}</pre>
            {audioBlob && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => playBlob(audioBlob)}>
                  <Volume2 size={14} /> 播放
                </Button>
                <Button size="sm" variant="secondary" onClick={() => downloadBlob(audioBlob, "配音.webm")}>
                  <Download size={14} /> 下载
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="min-h-48 flex items-center justify-center rounded-lg border border-black/10 bg-white/40 text-sm text-[var(--accent-dim)]">
            等待运行…
          </div>
        )}

        {!error && output && (
          <p className="mt-2 text-xs text-[var(--accent-dim)]">
            {modelReady ? "🤖 AI 模型驱动" : "⚡ 快速引擎（AI 模型加载中…）"}
          </p>
        )}
      </Card>
    </div>
  );
}
