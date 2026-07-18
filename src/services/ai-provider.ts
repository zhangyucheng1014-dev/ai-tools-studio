import type { ToolProvider, ToolRunInput, ToolRunResult } from "@/config/types";
import { getTool } from "@/config/tools";
import { providerEndpoints } from "@/config/providers";

// ── Endpoint ─────────────────────────────────────────────────────

function resolveEndpoint(provider: ToolProvider): string | null {
  const cfg = providerEndpoints[provider];
  for (const key of cfg.envKeys) {
    const val = process.env[key]?.trim();
    if (val) {
      const base = val.endsWith("/") ? val.slice(0, -1) : val;
      return `${base}${cfg.path}`;
    }
  }
  return null;
}

function resolveHeaders(provider: ToolProvider, isFile: boolean): Record<string, string> {
  const cfg = providerEndpoints[provider];
  const headers: Record<string, string> = {};
  if (!isFile) headers["Content-Type"] = "application/json";
  if (cfg.authHeader === "bearer" && cfg.apiKeyEnv) {
    const key = process.env[cfg.apiKeyEnv]?.trim();
    if (key) headers["Authorization"] = `Bearer ${key}`;
  } else if (cfg.authHeader === "x-api-key" && cfg.apiKeyEnv) {
    const key = process.env[cfg.apiKeyEnv]?.trim();
    if (key) headers["x-api-key"] = key;
  }
  return headers;
}

// ── Payload builders ─────────────────────────────────────────────

function buildPayload(provider: ToolProvider, input: ToolRunInput): unknown {
  const { prompt, options } = input;
  const s = (k: string, fb: string) =>
    typeof options?.[k] === "string" && (options[k] as string).trim()
      ? (options[k] as string).trim() : fb;
  const n = (k: string, fb: number) =>
    typeof options?.[k] === "number" && Number.isFinite(options[k])
      ? (options[k] as number) : fb;

  switch (provider) {
    case "TikTokDownloader":
      return { url: prompt, quality: s("quality", "1080p") };

    case "ContentRewriter":
      return { content: prompt, style: s("style", "通用"), target_length: n("targetLength", 500) };

    case "HeyGem":
      return {
        script: prompt,
        avatar_id: s("avatarId", "默认主播"),
        aspect_ratio: s("aspectRatio", "9:16（竖屏）")
      };

    case "GPT-SoVITS":
      return {
        script: prompt,
        voice: s("voice", "温暖女声"),
        speed: n("speed", 1.0),
        emotion: s("emotion", "自信")
      };

    case "OpenAICompatible":
      return {
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: "你是字幕生成助手。根据输入内容生成准确的字幕。" },
          { role: "user", content: `请生成${s("format", "SRT")}字幕。语言：${s("sourceLanguage", "中文")}，翻译为：${s("targetLanguage", "不翻译")}。\n内容：${prompt}` }
        ],
        temperature: 0.3
      };

    case "MoneyPrinterTurbo":
      return {
        title: s("title", prompt.slice(0, 30) || "AI 短视频"),
        script: prompt,
        bgm_style: s("bgmStyle", "轻快"),
        subtitle_style: s("subtitleStyle", "粗体"),
        aspect_ratio: s("aspectRatio", "9:16（竖屏）")
      };

    case "SocialAutoUpload":
      return {
        title: s("title", prompt.slice(0, 30) || "AI 短视频"),
        description: prompt,
        platforms: s("platforms", "抖音").split(",").map(p => p.trim()),
        scheduled_at: s("scheduledAt", "") || null
      };

    default:
      return { prompt };
  }
}

// ── Mock ─────────────────────────────────────────────────────────

function mockRun(provider: ToolProvider, input: ToolRunInput): ToolRunResult {
  const tool = getTool(input.toolSlug);
  const prompt = input.prompt.trim() || (input.fileName ? `上传了文件: ${input.fileName}` : "（未填写输入）");
  return {
    ok: true,
    provider,
    mock: true,
    output: [
      `【${tool?.name ?? input.toolSlug}】演示结果`,
      `输入: ${prompt.slice(0, 150)}`,
      input.fileName ? `文件: ${input.fileName} (${input.fileType ?? "未知类型"})` : "",
      ``,
      `✅ 任务已生成`,
      `📋 产物清单已就绪`,
      `💡 配置真实服务地址后自动调用 AI 服务`,
    ].filter(Boolean).join("\n")
  };
}

// ── HTTP ─────────────────────────────────────────────────────────

async function httpRun(provider: ToolProvider, input: ToolRunInput): Promise<ToolRunResult> {
  const endpoint = resolveEndpoint(provider);
  if (!endpoint) return mockRun(provider, input);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60s for file uploads

  try {
    let result = await attemptFetch(endpoint, provider, input, controller.signal);
    if (result) return result;
    await sleep(1000);
    result = await attemptFetch(endpoint, provider, input, controller.signal);
    if (result) return result;
    await sleep(2000);
    result = await attemptFetch(endpoint, provider, input, controller.signal);
    if (result) return result;
    return fallbackToMock(provider, input, "重试 3 次均失败");
  } catch (err) {
    return fallbackToMock(provider, input, err instanceof Error ? err.message : "未知错误");
  } finally {
    clearTimeout(timer);
  }
}

async function attemptFetch(
  endpoint: string,
  provider: ToolProvider,
  input: ToolRunInput,
  signal: AbortSignal
): Promise<ToolRunResult | null> {
  try {
    const hasFile = !!input.fileData;
    const headers = resolveHeaders(provider, hasFile);

    let body: string | FormData;
    if (hasFile) {
      // Send as multipart/form-data
      const fd = new FormData();
      fd.append("file", new Blob(
        [Buffer.from(input.fileData!, "base64")],
        { type: input.fileType ?? "application/octet-stream" }
      ), input.fileName ?? "file");
      fd.append("prompt", input.prompt);
      if (input.options) {
        for (const [k, v] of Object.entries(input.options)) {
          fd.append(k, String(v));
        }
      }
      body = fd;
    } else {
      body = JSON.stringify(buildPayload(provider, input));
    }

    const res = await fetch(endpoint, { method: "POST", headers, body, signal });
    if (!res.ok) return null;

    const data = await res.json();

    if (provider === "OpenAICompatible") {
      const content = data?.choices?.[0]?.message?.content;
      return { ok: true, provider, mock: false, output: content ?? JSON.stringify(data, null, 2) };
    }

    return {
      ok: true,
      provider,
      mock: false,
      output: typeof data === "string" ? data : JSON.stringify(data, null, 2)
    };
  } catch {
    return null;
  }
}

function fallbackToMock(provider: ToolProvider, input: ToolRunInput, reason: string): ToolRunResult {
  const mock = mockRun(provider, input);
  return { ...mock, output: `⚠️ 服务暂不可用 (${reason})\n已自动降级为演示结果\n\n${mock.output}` };
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Public ───────────────────────────────────────────────────────

export async function runTool(slug: string, input: ToolRunInput): Promise<ToolRunResult> {
  const tool = getTool(slug);
  if (!tool) throw new Error(`工具 "${slug}" 不存在`);
  return httpRun(tool.provider, { ...input, toolSlug: slug });
}
