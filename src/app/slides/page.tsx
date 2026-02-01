"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Code,
  Coins,
  Cpu,
  Database,
  Globe,
  Layers,
  Search,
  Server,
  Shield,
  Terminal,
  Maximize2,
  Minimize2,
} from "lucide-react";

type Slide =
  | {
      id: number;
      title: string;
      type: "title";
      tagline: string;
      subtitle: string;
      footer: string;
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "split";
      leftTitle: string;
      leftPoints: string[];
      rightTitle: string;
      rightPoints: string[];
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "demo";
      bullets: string[];
      script: string[];
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "diagram";
      highlight: string;
      events: string[];
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "columns";
      columns: Array<{
        icon: React.ReactNode;
        title: string;
        items: string[];
      }>;
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "summary";
      summary: string;
      steps: string[];
      closing: string;
      notes: string;
    };

const slides: Slide[] = [
  {
    id: 1,
    title: "TXray",
    type: "title",
    tagline: "X-ray vision for on-chain transactions",
    subtitle: "Tx hash → Explanation + Evidence, in real time",
    footer: "Author: DevTeam | Date: 2024 | v1.0",
    notes:
      "大家好，我是[名字]。今天向大家介绍 TXray —— 一个针对以太坊交易的实时分析 Agent。我们致力于解决链上数据晦涩难懂的问题，通过输入一个哈希，即刻生成带有完整证据链的易读研报。",
  },
  {
    id: 2,
    title: "Problem & Goal",
    type: "split",
    leftTitle: "The Friction (痛点)",
    leftPoints: [
      "Tx hashes are hard to understand (如同天书)",
      "Deep call stacks require multiple tools (RPC + Etherscan + Tenderly)",
      "Explanations without evidence are untrustworthy (AI 幻觉)",
    ],
    rightTitle: "Our Solution (目标)",
    rightPoints: [
      "One input: Tx Hash (单一入口)",
      "Real-time progress timeline (实时反馈)",
      "Explanation aligned with trace evidence (证据对齐)",
    ],
    notes:
      "传统分析需要在不同浏览器和调试工具间跳转，效率低下且难以验证 AI 解释的真实性。TXray 的目标是统一入口，让自然语言解释与底层证据（Evidence）严格对齐，所见即所得。",
  },
  {
    id: 3,
    title: "Live Demo Walkthrough",
    type: "demo",
    bullets: [
      "Streaming output (Token / SSE)",
      "Click to drill down per step (Modal)",
      "Invocation Flow for call trace (Tree View)",
    ],
    script: ["1. Paste Tx Hash", "2. Watch Timeline Run", "3. Open Tenderly Flow", "4. View RPC Details"],
    notes:
      "(演示环节) 随着 Timeline 的推进，后台并行抓取 RPC 和 Tenderly 数据。用户不仅能看到 AI 的解释，还能点击步骤查看具体的 Call Trace 树状图，数据实时流式传输。",
  },
  {
    id: 4,
    title: "Architecture & Data Flow",
    type: "diagram",
    highlight: "Evidence-first Pipeline",
    events: ["rpc_done", "etherscan_done", "tenderly_done", "token", "message_end"],
    notes:
      "架构核心基于 SSE 实现服务端推送。后端 Express 编排 RPC、Etherscan 和 Tenderly 的并发请求，确保前端能按 rpc_done 等事件实时渲染进度，而非枯燥等待。",
  },
  {
    id: 5,
    title: "Key Features",
    type: "columns",
    columns: [
      {
        icon: <Search className="w-6 h-6 mb-2 text-[#00ffcc]" />,
        title: "Explainable Evidence",
        items: ["RPC raw tx/receipt", "Etherscan ABI/Source", "Tenderly Invocation Tree"],
      },
      {
        icon: <Activity className="w-6 h-6 mb-2 text-[#00ffcc]" />,
        title: "Real-time UX",
        items: ["SSE progress updates", "Token streaming", "Timeline visualization"],
      },
      {
        icon: <Shield className="w-6 h-6 mb-2 text-[#00ffcc]" />,
        title: "Productization",
        items: ["EIP-8004 Reputation", "x402 Payment Gate", "Env Config (Local/Prod)"],
      },
    ],
    notes:
      "TXray 不仅仅是一个 Demo。我们在数据层整合了 Tenderly 的深度 Trace，在产品层集成了 EIP-8004 反馈机制和 x402 支付网关，具备了商业化落地的雏形。",
  },
  {
    id: 6,
    title: "Summary & Next Steps",
    type: "summary",
    summary: "Turn tx hashes into readable reports with verifiable evidence.",
    steps: [
      "Add Balance Changes + Logs (Explorer-grade)",
      "Shareable Report Links + Caching",
      "Trace Performance: Pagination/Virtualization",
    ],
    closing: "TXray makes on-chain forensics fast and intuitive.",
    notes:
      "总结来说，TXray 让链上取证变得直观且快速。下一步我们将重点优化 Trace 的大列表渲染性能，并支持生成快照链接，方便社区分享交易分析结果。谢谢大家。",
  },
];

export default function SlidesPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const deckRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await deckRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Space") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key.toLowerCase() === "n") setShowNotes((v) => !v);
      if (e.key.toLowerCase() === "f") void toggleFullscreen();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const slide = useMemo(() => slides[currentSlide], [currentSlide]);

  return (
    <div className={isFullscreen ? "bg-[#050505] text-gray-300 font-mono selection:bg-[#00ffcc] selection:text-black" : "min-h-screen bg-[#050505] text-gray-300 font-mono flex flex-col items-center justify-center p-4 selection:bg-[#00ffcc] selection:text-black"}>
      <div
        ref={deckRef}
        className={isFullscreen ? "w-screen h-screen flex flex-col items-center justify-center" : "w-full max-w-5xl aspect-[16/9] bg-[#0a0a0a] border border-[#1f1f1f] relative overflow-hidden shadow-2xl flex flex-col"}
        style={
          isFullscreen
            ? {
                background: "#0a0a0a",
              }
            : undefined
        }
      >
        {/* In fullscreen: keep 16:9 canvas scaled to viewport */}
        <div
          className={isFullscreen ? "w-full h-full flex flex-col" : "contents"}
          style={
            isFullscreen
              ? {
                  width: "min(100vw, calc(100vh * 16 / 9))",
                  height: "min(100vh, calc(100vw * 9 / 16))",
                }
              : undefined
          }
        >
        {/* Top Bar */}
        <div className="h-8 bg-[#111] border-b border-[#222] flex items-center px-4 justify-between">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 opacity-50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50" />
            <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-600">
              TXray_Demo_Deck.ppt // Slide {currentSlide + 1}/{slides.length}
            </div>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="text-gray-500 hover:text-white/80 transition-colors flex items-center gap-1 text-[11px]"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span className="hidden sm:inline">{isFullscreen ? "Exit" : "Full"}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-12 relative flex flex-col">
          {/* Background Decor */}
          <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-12 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-full border-r border-[#00ffcc] opacity-20" />
            ))}
          </div>

          {/* Slide Content */}
          <div className="z-10 flex-1 flex flex-col">
            {slide.type !== "title" && (
              <div className="mb-8 border-l-4 border-[#00ffcc] pl-4">
                <h2 className="text-3xl font-bold tracking-tight text-white uppercase">{slide.title}</h2>
              </div>
            )}

            {slide.type === "title" && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="mb-6 relative">
                  <div className="absolute -inset-4 bg-[#00ffcc] opacity-20 blur-xl rounded-full" />
                  <Terminal className="w-24 h-24 text-[#00ffcc] relative z-10" />
                </div>
                <h1 className="text-7xl font-bold text-white tracking-tighter mb-4">TXray</h1>
                <p className="text-2xl text-[#00ffcc] mb-8">{slide.tagline}</p>
                <div className="px-6 py-2 border border-[#333] bg-[#111] rounded text-lg">{slide.subtitle}</div>
                <div className="absolute bottom-12 text-xs text-gray-500 font-mono">{slide.footer}</div>
              </div>
            )}

            {slide.type === "split" && (
              <div className="flex gap-12 h-full items-center">
                <div className="flex-1 space-y-6">
                  <h3 className="text-xl text-red-400 border-b border-red-900/30 pb-2">_PROBLEM</h3>
                  <ul className="space-y-4">
                    {slide.leftPoints.map((p, i) => (
                      <li key={i} className="flex gap-3 text-gray-400">
                        <span className="text-red-500">×</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="w-px h-2/3 bg-gradient-to-b from-transparent via-[#333] to-transparent" />
                <div className="flex-1 space-y-6">
                  <h3 className="text-xl text-[#00ffcc] border-b border-[#00ffcc]/30 pb-2">_GOAL</h3>
                  <ul className="space-y-4">
                    {slide.rightPoints.map((p, i) => (
                      <li key={i} className="flex gap-3 text-white">
                        <span className="text-[#00ffcc]">✓</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {slide.type === "demo" && (
              <div className="flex gap-8 h-full">
                <div className="flex-[2] bg-[#000] border border-[#333] rounded-lg p-2 flex flex-col relative overflow-hidden group">
                  <div className="h-6 bg-[#1a1a1a] flex items-center px-2 text-[10px] text-gray-500 mb-2 rounded border-b border-[#333]">
                    localhost:3000/tx/0x123...
                  </div>
                  <div className="flex-1 p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-8 h-8 rounded bg-[#00ffcc] flex items-center justify-center text-black font-bold">
                        TX
                      </div>
                      <div className="h-2 w-32 bg-[#333] rounded animate-pulse" />
                    </div>
                    <div className="flex gap-1 items-center mb-6">
                      <div className="h-1 flex-1 bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]" />
                      <div className="h-1 flex-1 bg-[#00ffcc]" />
                      <div className="h-1 flex-1 bg-[#333]" />
                      <div className="h-1 flex-1 bg-[#333]" />
                    </div>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="text-[#00ffcc]">{`> Analyzing transaction input...`}</div>
                      <div className="text-gray-400 pl-4 border-l border-[#333]">
                        Function: swapExactTokensForTokens
                        <br />
                        To: Uniswap V2 Router
                        <br />
                        Value: 1.5 ETH
                      </div>
                      <div className="text-[#00ffcc] animate-pulse">{`> Fetching Tenderly trace..._`}</div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-[#00ffcc] text-black px-4 py-2 font-bold">LIVE PREVIEW</div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-center space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-[#00ffcc] text-sm uppercase tracking-widest">Key Actions</h3>
                    <ul className="space-y-2">
                      {slide.bullets.map((b, i) => (
                        <li key={i} className="text-sm flex items-center gap-2">
                          <ChevronRight className="w-3 h-3 text-[#00ffcc]" /> {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-[#111] border border-[#333] p-4 rounded text-xs text-gray-400 font-mono">
                    <div className="text-gray-500 mb-2 border-b border-[#333] pb-1">DEMO_SCRIPT.md</div>
                    {slide.script.map((s, i) => (
                      <div key={i} className={i === 1 ? "text-[#00ffcc]" : ""}>
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {slide.type === "diagram" && (
              <div className="flex flex-col h-full justify-center">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 bg-[#111] border border-white/20 rounded-lg flex flex-col items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                      <Globe className="w-8 h-8 mb-2 text-white" />
                      <span>Next.js</span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col items-center px-4 relative">
                    <div className="text-[#00ffcc] text-xs mb-1 font-bold">SSE STREAM</div>
                    <div className="h-px w-full bg-[#00ffcc] relative">
                      <div className="absolute right-0 -top-1 w-2 h-2 bg-[#00ffcc] rounded-full animate-ping" />
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap justify-center">
                      {slide.events.map((evt, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-[#00ffcc]/10 text-[#00ffcc] px-1 rounded border border-[#00ffcc]/20"
                        >
                          {evt}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 h-24 bg-[#111] border border-[#00ffcc] rounded-lg flex flex-col items-center justify-center shadow-[0_0_15px_rgba(0,255,204,0.1)]">
                      <Server className="w-8 h-8 mb-2 text-[#00ffcc]" />
                      <span>Express</span>
                    </div>
                  </div>

                  <div className="w-12 flex justify-center">
                    <ArrowRight className="text-gray-600" />
                  </div>

                  <div className="flex flex-col gap-2">
                    {["RPC Node", "Etherscan", "Tenderly"].map((item, i) => (
                      <div
                        key={i}
                        className="bg-[#222] border border-[#333] px-3 py-2 rounded text-xs flex items-center gap-2 w-32"
                      >
                        <Database className="w-3 h-3 text-gray-500" /> {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <span className="inline-block px-4 py-1 rounded-full border border-[#00ffcc] text-[#00ffcc] text-sm bg-[#00ffcc]/5">
                    {slide.highlight}
                  </span>
                </div>
              </div>
            )}

            {slide.type === "columns" && (
              <div className="grid grid-cols-3 gap-6 h-full items-center">
                {slide.columns.map((col, i) => (
                  <div
                    key={i}
                    className="h-64 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-[#222] p-6 rounded-lg hover:border-[#00ffcc]/50 transition-colors group"
                  >
                    <div className="mb-4">{col.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-4 group-hover:text-[#00ffcc] transition-colors">
                      {col.title}
                    </h3>
                    <ul className="space-y-3">
                      {col.items.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-400 flex items-start gap-2">
                          <span className="text-[#333] mt-0.5">●</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {slide.type === "summary" && (
              <div className="flex flex-col justify-center h-full max-w-2xl mx-auto">
                <div className="mb-8">
                  <h3 className="text-2xl text-white mb-6 leading-relaxed">"{slide.summary}"</h3>
                  <div className="space-y-4">
                    <div className="text-xs text-[#00ffcc] uppercase tracking-widest mb-2">Next Steps</div>
                    {slide.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-[#111] border border-[#222] rounded">
                        <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center text-xs text-gray-500">
                          {i + 1}
                        </div>
                        <span className="text-sm">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-8 pt-8 border-t border-[#222] text-center">
                  <div className="text-[#00ffcc] animate-pulse font-bold text-lg">
                    {slide.closing} <span className="inline-block w-2 h-4 bg-[#00ffcc] ml-1 animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {showNotes && (
          <div className="bg-[#080808] border-t border-[#222] p-4 h-24 overflow-y-auto">
            <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Presenter Notes (CN)</div>
            <p className="text-sm text-gray-400 font-sans leading-relaxed">{slide.notes}</p>
          </div>
        )}
        </div>
      </div>

      {/* Controls */}
      {!isFullscreen && (
        <div className="mt-8 flex gap-4 text-gray-500 text-sm">
        <button onClick={prevSlide} className="hover:text-white flex items-center gap-1">
          <ChevronLeft size={16} /> Prev
        </button>
        <button onClick={() => setShowNotes(!showNotes)} className="hover:text-white">
          {showNotes ? "Hide" : "Show"} Notes (N)
        </button>
        <button onClick={nextSlide} className="hover:text-white flex items-center gap-1">
          Next <ChevronRight size={16} />
        </button>
        </div>
      )}

      {/* Hidden imports used by lucide-react tree-shaking sanity */}
      <span className="hidden">
        <Layers />
        <Cpu />
        <Coins />
        <Code />
        <Terminal />
      </span>
    </div>
  );
}

