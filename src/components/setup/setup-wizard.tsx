"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Wrench, Download, CheckCircle, XCircle, LoaderCircle, ExternalLink } from "lucide-react";
import { Button, Card } from "@/components/ui/base";

type Step = "check" | "install-python" | "install-services" | "ready";

interface PyStatus {
  installed: boolean; version: string | null; path: string | null;
}

interface SvcStatus {
  id: string; name: string; port: number;
  status: "stopped" | "starting" | "running" | "error";
}

// ── 获取 Electron API ──────────────────────────────────────────────
function getAPI() {
  return (window as any).electronAPI;
}

// ── 主组件 ─────────────────────────────────────────────────────────

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>("check");
  const [pyStatus, setPyStatus] = useState<PyStatus | null>(null);
  const [services, setServices] = useState<SvcStatus[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);

  const api = getAPI();

  // 检测 Python
  const checkPython = useCallback(async () => {
    if (!api) {
      addLog("⚠️ 桌面 API 不可用，跳过外部服务检测");
      setStep("ready");
      return;
    }
    const status = await api.detectPython();
    setPyStatus(status);
    setStep(status.installed ? "install-services" : "install-python");
  }, [api]);

  // 安装 Python
  const doInstallPython = async () => {
    if (!api) return;
    setInstalling(true);
    addLog("开始安装 Python 3.10 (embeddable, ~6MB)…");
    const result = await api.installPython();
    for (const m of result.log) addLog(m);
    setInstalling(false);

    if (result.ok) {
      setPyStatus({ installed: true, version: "Python 3.10.11", path: "~/.ai-tools-studio/python/python.exe" });
      setStep("install-services");
    } else {
      addLog("❌ 安装失败，请手动安装 Python 3.10+ 并添加到 PATH");
    }
  };

  // 刷新服务状态
  const refreshServices = async () => {
    if (!api) return;
    const svcs = await api.getServiceStatus();
    setServices(svcs);
  };

  useEffect(() => { refreshServices(); }, []);

  // 启动服务
  const doStartService = async (id: string) => {
    if (!api) return;
    setInstalling(true);
    addLog(`🚀 启动 ${id}…`);
    const result = await api.startService(id);
    for (const m of result.log) addLog(m);
    if (result.ok) addLog(`✅ ${id} 已启动，端口 ${result.port}`);
    else addLog(`❌ ${id}: ${result.error || "启动失败"}`);
    setInstalling(false);
    refreshServices();
  };

  const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

  useEffect(() => {
    if (step === "check") checkPython();
  }, [step, checkPython]);

  const allRunning = services.length > 0 && services.every(s => s.status === "running");

  return (
    <Card className="max-w-2xl mx-auto">
      {/* 步骤指示器 */}
      <div className="flex items-center gap-2 mb-6">
        {(["check", "install-python", "install-services", "ready"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? "bg-[var(--accent)] text-white" :
                ["check","install-python","install-services","ready"].indexOf(step) > i
                ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
              {["check","install-python","install-services","ready"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span className="text-xs text-[var(--muted)]">
              {s === "check" ? "检测" : s === "install-python" ? "Python" : s === "install-services" ? "服务" : "就绪"}
            </span>
            {i < 3 && <div className="w-4 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: 检测 */}
      {step === "check" && (
        <div className="text-center py-8">
          <LoaderCircle size={32} className="animate-spin mx-auto text-[var(--accent)]" />
          <p className="mt-4 text-sm text-[var(--muted)]">正在检测 Python 环境…</p>
        </div>
      )}

      {/* Step 2: 安装 Python */}
      {step === "install-python" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <XCircle size={22} className="text-red-500" />
            <div>
              <p className="font-semibold">Python 未安装</p>
              <p className="text-sm text-[var(--muted)]">视频下载、AI配音增强需要 Python 3.10+</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={doInstallPython} disabled={installing}>
              {installing ? <LoaderCircle size={14} className="animate-spin" /> : <Download size={14} />}
              一键安装 Python 3.10
            </Button>
            <Button variant="secondary" onClick={() => setStep("install-services")}>
              跳过（仅用内置引擎）
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 安装/启动服务 */}
      {step === "install-services" && (
        <div>
          <p className="mb-3 text-sm font-semibold">
            {pyStatus?.installed ? "✅ Python " + pyStatus.version : "⚠️ 未检测到 Python，仅显示内置引擎"}
          </p>

          <div className="grid gap-2">
            {services.map(svc => (
              <div key={svc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {svc.status === "running" ? <CheckCircle size={16} className="text-green-500" />
                    : svc.status === "starting" ? <LoaderCircle size={16} className="animate-spin" />
                    : svc.status === "error" ? <XCircle size={16} className="text-red-500" />
                    : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                  <div>
                    <p className="text-sm font-medium">{svc.name}</p>
                    <p className="text-xs text-[var(--muted)]">端口 {svc.port} · {svc.status}</p>
                  </div>
                </div>
                <Button size="sm" variant="secondary"
                  onClick={() => doStartService(svc.id)}
                  disabled={installing || svc.status === "running" || svc.status === "starting" || !pyStatus?.installed}>
                  <Play size={12} />
                  {svc.status === "running" ? "运行中" : "启动"}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-3">
            <Button onClick={() => { setStep("ready"); onComplete(); }} disabled={installing}>
              完成设置
            </Button>
            <Button variant="ghost" size="sm" onClick={refreshServices}>
              刷新状态
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: 就绪 */}
      {step === "ready" && (
        <div className="text-center py-6">
          <CheckCircle size={40} className="mx-auto text-green-500" />
          <p className="mt-3 font-semibold">
            {allRunning ? "🎉 全部就绪！" : "✅ 设置完成"}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {pyStatus?.installed
              ? `Python ${pyStatus.version} · ${services.filter(s=>s.status==="running").length}/${services.length} 服务运行中`
              : "使用内置引擎运行，安装 Python 可获得增强效果"}
          </p>
          <Button className="mt-4" onClick={onComplete}>开始使用</Button>
        </div>
      )}

      {/* 日志 */}
      {logs.length > 0 && (
        <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-[#121512] p-3 text-xs text-[#e9f4ed]">
          {logs.map((l, i) => <div key={i}>{l}</div>)}
        </pre>
      )}
    </Card>
  );
}
