"use client";

import { Play, Settings2, WandSparkles, Upload, ArrowLeft } from "lucide-react";
import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui/base";
import { toolOptions, type FieldDef } from "@/config/tool-options";

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

  const fields: FieldDef[] = toolOptions[tool.slug] ?? [];
  const [options, setOptions] = useState<Record<string, string | number>>(() => {
    const d: Record<string, string | number> = {};
    for (const f of fields) {
      if (f.type !== "file" && f.defaultValue !== undefined) d[f.key] = f.defaultValue;
    }
    return d;
  });

  const hasFileField = fields.some(f => f.type === "file");

  const run = useCallback(async () => {
    const hasText = prompt.trim();
    if (!hasText && !file) return;
    setLoading(true);
    setError(null);
    setOutput("处理中…");

    try {
      let res: Response;

      if (file) {
        // File upload: use FormData
        const fd = new FormData();
        fd.append("prompt", prompt);
        fd.append("file", file);
        for (const [k, v] of Object.entries(options)) {
          fd.append(k, String(v));
        }
        res = await fetch(`/api/tools/${tool.slug}`, { method: "POST", body: fd });
      } else {
        // Text only: JSON
        res = await fetch(`/api/tools/${tool.slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, options })
        });
      }

      const data = await res.json();
      if (!data.ok) {
        setError(data.output ?? "请求失败");
        setOutput("");
        return;
      }
      setOutput(data.output);
    } catch {
      setError("网络请求失败，请重试");
      setOutput("");
    } finally {
      setLoading(false);
    }
  }, [prompt, options, file, tool.slug]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)] transition-colors">
          <ArrowLeft size={16} /> 返回
        </Link>

        <Card>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <WandSparkles size={16} /> 输入区域
          </div>

          {/* File upload area */}
          {hasFileField && (
            <div className="mb-4">
              <input
                ref={fileRef}
                type="file"
                accept={fields.find(f => f.type === "file")?.accept ?? "*/*"}
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-black/15 bg-white/40 px-4 py-6 text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Upload size={18} />
                {file ? (
                  <span className="text-[var(--fg)]">{file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
                ) : (
                  "点击上传文件"
                )}
              </button>
            </div>
          )}

          {/* Text input */}
          {!tool.fileBased ? (
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={`输入${tool.inputs.slice(0, 2).join("、")}…`}
              className="min-h-36 w-full resize-none rounded-lg border border-black/10 bg-white/80 p-4 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
            />
          ) : (
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="补充描述（选填）…"
              className="min-h-20 w-full resize-none rounded-lg border border-black/10 bg-white/80 p-4 text-sm leading-6 outline-none transition focus:border-[var(--accent)]"
            />
          )}

          <Button className="mt-4" onClick={run} disabled={loading || (!prompt.trim() && !file)}>
            <Play size={14} /> {loading ? "处理中…" : "开始运行"}
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
                    <select
                      value={String(options[f.key] ?? f.defaultValue ?? "")}
                      onChange={e => setOptions(p => ({ ...p, [f.key]: e.target.value }))}
                      className="rounded-lg border border-black/10 bg-white/80 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                    >
                      {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={String(options[f.key] ?? f.defaultValue ?? "")}
                      onChange={e => setOptions(p => ({
                        ...p,
                        [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value
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

      <Card>
        <div className="mb-3 text-sm font-semibold">输出结果</div>
        {error ? (
          <div className="min-h-48 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
            {error}
          </div>
        ) : output ? (
          <pre className="min-h-48 whitespace-pre-wrap rounded-lg border border-black/10 bg-[#121512] p-4 text-sm leading-7 text-[#e9f4ed]">
            {output}
          </pre>
        ) : (
          <div className="min-h-48 flex items-center justify-center rounded-lg border border-black/10 bg-white/40 text-sm text-[var(--accent-dim)]">
            等待运行…
          </div>
        )}
        {!error && output && output !== "处理中…" && (
          <p className="mt-2 text-xs text-[var(--accent-dim)]">
            {output.includes("Mock") || output.includes("降级") ? "ℹ️ Mock 演示模式" : "✅ 真实服务响应"}
          </p>
        )}
      </Card>
    </div>
  );
}
