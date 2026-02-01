"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Info,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    }
  | {
      id: number;
      title: string;
      type: "roadmap";
      items: Array<{
        title: string;
        description: string;
      }>;
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "qa";
      closing: string;
      notes: string;
    }
  | {
      id: number;
      title: string;
      type: "timeline-flow";
      input: string;
      steps: Array<{
        id: string;
        label: string;
        status: string;
        info: string;
        details: string[];
      }>;
      verdict: {
        type: string;
        summary: string;
      };
      notes: string;
    };

const slides: Slide[] = [
  {
    id: 1,
    title: "TXray",
    type: "title",
    tagline: "X-ray vision for on-chain transactions",
    subtitle: "Tx hash → Explanation + Evidence, in real time",
    footer: "Team: NVRGVUP | Authors: ddd999, Link | University of Chinese Academy of Sciences | Date: 2026-02-02",
    notes:
      "Hi everyone, I’m [Name]. Today I’ll introduce TXray — a real-time Ethereum transaction analysis agent. Paste a tx hash and instantly get a readable report backed by a verifiable evidence trail (RPC/Etherscan/Tenderly).",
  },
  {
    id: 2,
    title: "Problem & Goal",
    type: "split",
    leftTitle: "The Friction",
    leftPoints: [
      "Tx hashes are hard to understand",
      "Deep call stacks require multiple tools (RPC + Etherscan + Tenderly)",
      "LLM Struggling with Complex Call Traces",
      "Explanations without evidence are untrustworthy",
    ],
    rightTitle: "Our Solution",
    rightPoints: [
      "One input: Tx Hash",
      "Real-time progress timeline",
      "Explanation aligned with trace evidence",
    ],
    notes:
      "Traditional tx analysis requires switching between multiple tools and manually piecing the story together. It’s slow and explanations are hard to trust without evidence. TXray unifies the workflow and keeps the narrative aligned with trace-level evidence.",
  },
  {
    id: 3,
    title: "Live Forensics Pipeline",
    type: "timeline-flow",
    input: "0x7b0d94187360134a6d64d3fe3f151d55437ef15c538a6e618cee1aec8db292fb",
    steps: [
      { 
        id: "rpc", 
        label: "RPC NETWORK LAYER", 
        status: "COMMITTED", 
        info: "Fetching raw data",
        details: ["> block: 19283745", "> gas_price: 42.5 gwei", "> status: success"]
      },
      { 
        id: "etherscan", 
        label: "ETHERSCAN INTEL", 
        status: "INDEXED", 
        info: "Decoding contracts",
        details: ["> flash_loan identified (Aave V3)", "> route: UniV3 -> SushiV2", "> multi-contract execution"]
      },
      { 
        id: "tenderly", 
        label: "TENDERLY SIMULATION", 
        status: "REPLAYED", 
        info: "Deep call trace",
        details: ["> internal_calls: 156", "> trace_depth: 8 levels", "> asset_flow: cyclic detected"]
      },
      { 
        id: "draft", 
        label: "NEURAL ENGINE", 
        status: "ANALYZED", 
        info: "Pattern matching",
        details: ["> matching arb pattern: cycle", "> extracting revenue metrics", "> verifying atomic balance"]
      },
    ],
    verdict: {
      type: "MEV ARBITRAGE DETECTED",
      summary: "Net Profit: +0.42 ETH ($1,050). Route: Flash loan 50 ETH → Swapped to USDC (UniV3) → Back to ETH (SushiV2). Strategy: Atomic price discrepancy exploitation."
    },
    notes:
      "(Live Demo) This is how TXray feels in action. We simulate the user input, then watch the pipeline ignite. Each step doesn't just show a status; it reveals the specific evidence captured. Finally, the AI synthesizes this into a high-confidence verdict like 'Arbitrage' or 'Sandwich'.",
  },
  {
    id: 4,
    title: "Architecture & Data Flow",
    type: "diagram",
    highlight: "LangGraph-driven Evidence Agent",
    events: ["rpc_done", "etherscan_done", "tenderly_done", "token", "message_end"],
    notes:
      "TXray uses LangGraph as the core orchestrator. Instead of a linear script, LangGraph manages the agent's state and node transitions (e.g., Enrich -> Explain -> Verify). The backend (Express) feeds data to the graph and uses SSE to stream real-time progress events back to the frontend.",
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
      "TXray is not just a demo. On the data side, it integrates deep Tenderly traces; on the product side, it adds EIP-8004 reputation feedback and an x402 pay-per-request gate — making it closer to production and monetization.",
  },
  {
    id: 6,
    title: "Future Roadmap",
    type: "roadmap",
    items: [
      {
        title: "Block-Level Analysis",
        description: "Analyze a tx in its block context (neighbors, ordering, and interactions).",
      },
      {
        title: "Real-Time Mempool Monitoring",
        description: "Detect pre-trade MEV signals and monitor pending tx activity in real time.",
      },
      {
        title: "Contract Decompilation",
        description: "Decompile unverified contracts to recover higher-level behavior and selectors.",
      },
      {
        title: "MEV Bundle Analysis",
        description: "Analyze bundled execution (builder/relay) and multi-tx MEV strategies.",
      },
    ],
    notes:
      "Roadmap: (1) block-level analysis to understand tx context and surrounding activity, (2) real-time mempool monitoring for pre-trade MEV signals, (3) decompilation for unverified contracts, and (4) MEV bundle analysis to reason about bundled execution and builder behavior.",
  },
  {
    id: 7,
    title: "Summary",
    type: "summary",
    summary: "TXray turns a tx hash into a real-time, evidence-backed explanation.",
    steps: [
      "LangGraph-driven agent: Reliable Enrich -> Explain -> Verify loop",
      "Timeline-driven pipeline: Real-time progress via SSE stream",
      "Evidence-first drilldown: Invocation Flow / Call List / Raw Trace",
      "Product-ready: EIP-8004 reputation + x402 paywall",
      "Live Experience: https://txray.vercel.app/",
    ],
    closing: "Try it now: txray.vercel.app",
    notes:
      "Wrap-up: TXray combines streaming UX with verifiable evidence to make on-chain forensics fast and trustworthy. By using LangGraph, we ensure the AI's logic is grounded in actual chain data.",
  },
  {
    id: 8,
    title: "Q&A",
    type: "qa",
    closing: "Thank You! // txray.vercel.app",
    notes:
      "Q&A. I can answer questions about the data pipeline, how SSE events map to UI, why we added verification, how EIP-8004 reputation works, and how x402 pay-per-request gating is integrated.",
  },
];

export default function SlidesPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const deckRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const slide = useMemo(() => slides[currentSlide], [currentSlide]);

  // Auto-scroll terminal during timeline-flow animation
  useEffect(() => {
    if (slide?.type === "timeline-flow") {
      const interval = setInterval(() => {
        if (terminalRef.current) {
          terminalRef.current.scrollTo({
            top: terminalRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [slide?.type, currentSlide]);

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
      if (e.repeat) return;
      const isNext = e.code === "ArrowRight" || e.code === "Space";
      const isPrev = e.code === "ArrowLeft";
      if (isNext || isPrev) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (isNext) nextSlide();
      if (isPrev) prevSlide();
      if (e.key.toLowerCase() === "n") setShowNotes((v) => !v);
      if (e.key.toLowerCase() === "f") void toggleFullscreen();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!slide) return null;

  return (
    <div className={isFullscreen ? "bg-[#050505] text-gray-300 font-mono selection:bg-[#00ffcc] selection:text-black" : "min-h-screen bg-[#050505] text-gray-300 font-mono flex flex-col items-center justify-center p-4 selection:bg-[#00ffcc] selection:text-black"}>
      <div
        ref={deckRef}
        className={isFullscreen ? "w-screen h-screen flex flex-col items-center justify-center" : "w-full max-w-5xl aspect-[16/9] bg-[#0a0a0a] border border-[#1f1f1f] relative overflow-hidden shadow-2xl flex flex-col"}
        style={isFullscreen ? { background: "#0a0a0a" } : undefined}
      >
        <div
          className={isFullscreen ? "w-full h-full flex flex-col" : "contents"}
          style={isFullscreen ? { width: "min(100vw, calc(100vh * 16 / 9))", height: "min(100vh, calc(100vw * 9 / 16))" } : undefined}
        >
          <div className="h-8 bg-[#111] border-b border-[#222] flex items-center px-4 justify-between">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 opacity-50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-50" />
              <div className="w-3 h-3 rounded-full bg-green-500 opacity-50" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={prevSlide} className="text-gray-500 hover:text-white/80 transition-colors flex items-center gap-1 text-[11px]">
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </button>
              <div className="text-xs text-gray-600">TXray_Deck.ppt // Slide {currentSlide + 1}/{slides.length}</div>
              <button onClick={nextSlide} className="text-gray-500 hover:text-white/80 transition-colors flex items-center gap-1 text-[11px]">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </button>
              <button onClick={() => setShowNotes(!showNotes)} className={cn("text-gray-500 hover:text-white/80 transition-colors flex items-center gap-1 text-[11px]", showNotes && "text-[#00ffcc]")}>
                <Info size={14} />
                <span className="hidden sm:inline">{showNotes ? "Hide Notes" : "Show Notes"}</span>
              </button>
              <button onClick={() => void toggleFullscreen()} className="text-gray-500 hover:text-white/80 transition-colors flex items-center gap-1 text-[11px]">
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
            </div>
          </div>

          <div className="flex-1 p-12 relative flex flex-col overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-12 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-full border-r border-[#00ffcc] opacity-20" />
              ))}
            </div>

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
                  <div className="absolute bottom-12 text-[10px] text-gray-500 font-mono w-full px-12">{slide.footer}</div>
                </div>
              )}

              {slide.type === "split" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex gap-12 items-center">
                  <div className="flex-1 space-y-6">
                    <h3 className="text-xl text-red-400 border-b border-red-900/30 pb-2">_PROBLEM</h3>
                    <ul className="space-y-4">
                      {slide.leftPoints.map((p, i) => (
                        <li key={i} className="flex gap-3 text-gray-400 text-sm">
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
                        <li key={i} className="flex gap-3 text-white text-sm">
                          <span className="text-[#00ffcc]">✓</span> {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {slide.type === "timeline-flow" && (
                <div className="flex-1 flex gap-12 h-full items-start pt-4">
                  <div className="flex-[1.5] relative h-[92%] border border-[#333] bg-[#050505] rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col">
                    <div className="h-7 bg-[#1a1a1a] border-b border-[#333] flex items-center px-3 gap-1.5 shrink-0">
                      <div className="w-2 h-2 rounded-full bg-red-500/50" />
                      <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                      <div className="w-2 h-2 rounded-full bg-green-500/50" />
                      <div className="ml-2 text-[9px] text-gray-500 font-mono tracking-tighter">operator@txray:~/forensics</div>
                    </div>
                    <div className="flex-1 p-6 font-mono text-[11px] overflow-hidden flex flex-col relative">
                      {/* User Input Simulation */}
                      <div className="mb-8 shrink-0">
                        <span className="text-[#00ffcc] mr-2">$ txray --scan</span>
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white bg-[#00ffcc]/20 px-1">
                          {slide.input.slice(0, 30)}...
                        </motion.span>
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} className="inline-block w-1.5 h-3.5 bg-[#00ffcc] align-middle ml-1" />
                      </div>

                      {/* Sequential Pipeline Steps */}
                      <div 
                        ref={terminalRef}
                        className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-20 scroll-smooth"
                      >
                        {slide.steps.map((s, i) => (
                          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 + i * 1.5 }} className="relative pl-6 border-l border-white/5">
                            <div className="absolute left-[-4.5px] top-1.5 w-2 h-2 rounded-full bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]" />
                            <div className="flex items-center gap-3 mb-1.5">
                              <span className="text-[#00ffcc] font-black text-[9px] tracking-widest">{s.label}</span>
                              <span className="text-[8px] px-1 bg-[#00ffcc]/10 border border-[#00ffcc]/20 rounded uppercase">{s.status}</span>
                            </div>
                            <div className="space-y-0.5 opacity-60">
                              {s.details.map((detail, dIdx) => (
                                <motion.div key={dIdx} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.8 + i * 1.5 + dIdx * 0.2 }} className="text-[10px]">{detail}</motion.div>
                              ))}
                            </div>
                          </motion.div>
                        ))}

                        {/* Final Verdict Card - Now inside the scrollable area to scroll with content */}
                        <AnimatePresence>
                          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: 8.5, type: "spring" }} className="mt-8 bg-[#00ffcc] p-4 rounded-lg text-black relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 p-1 opacity-20"><Shield size={40} /></div>
                            <div className="text-[10px] font-black tracking-[0.2em] mb-1 uppercase">_FORENSIC_VERDICT</div>
                            <div className="text-lg font-black leading-tight mb-1 uppercase italic">{slide.verdict.type}</div>
                            <div className="text-[10px] leading-relaxed font-bold opacity-80">{slide.verdict.summary}</div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 space-y-8 pt-8">
                    <div className="space-y-4">
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase italic border-l-4 border-[#00ffcc] pl-4">Interactive Tracing</h3>
                      <p className="text-sm text-white/50 leading-relaxed">Instead of a static loading spinner, TXray provides a granular lifecycle of the transaction analysis. Each event in the <span className="text-[#00ffcc] font-bold underline decoration-[#00ffcc]/30 underline-offset-4 tracking-widest">SSE_STREAM</span> triggers sub-second UI updates.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {[{ icon: <Activity size={14}/>, text: "Real-time Node Communication" }, { icon: <Terminal size={14}/>, text: "Live Evidence Extraction" }, { icon: <Search size={14}/>, text: "Automated MEV Recognition" }].map((it, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-[11px] font-mono tracking-wider text-white/60">
                          <span className="text-[#00ffcc]">{it.icon}</span>
                          {it.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {slide.type === "diagram" && (
                <div className="flex flex-col h-full justify-center">
                  <div className="flex items-center justify-between">
                    {/* Frontend */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-28 h-28 bg-[#111] border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center shadow-xl">
                        <Globe className="w-10 h-10 mb-2 text-white" />
                        <span className="text-xs font-bold">Next.js</span>
                      </div>
                      <div className="text-[10px] text-white/30 font-mono">Frontend UI</div>
                    </div>

                    {/* SSE Connection */}
                    <div className="flex-1 flex flex-col items-center px-4 relative h-full justify-center">
                      <div className="text-[#00ffcc] text-[10px] mb-8 font-black tracking-widest absolute top-[30%]">SSE REAL-TIME STREAM</div>
                      
                      <div className="h-0.5 w-full bg-gradient-to-r from-white/5 via-[#00ffcc] to-white/5 relative">
                        {/* Flowing Event Labels - Fixed spacing to prevent overlapping */}
                        <div className="absolute inset-0 w-full h-10 top-3 pointer-events-none overflow-visible">
                          {slide.events.map((evt, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ left: "100%", opacity: 0 }}
                              animate={{ left: "-10%", opacity: [0, 1, 1, 0] }}
                              transition={{ 
                                duration: 10, 
                                repeat: Infinity, 
                                delay: idx * 2,
                                ease: "linear" 
                              }}
                              className="absolute whitespace-nowrap text-[7px] font-mono font-bold text-[#00ffcc]/70 bg-[#00ffcc]/5 px-1.5 py-0.5 rounded border border-[#00ffcc]/20"
                            >
                              {evt}
                            </motion.div>
                          ))}
                        </div>
                        
                        <motion.div 
                          animate={{ left: ["0%", "100%"] }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: "easeInOut",
                            repeatType: "reverse"
                          }}
                          className="absolute -top-1 w-2.5 h-2.5 bg-[#00ffcc] rounded-full shadow-[0_0_15px_#00ffcc,0_0_5px_white] z-20" 
                        />
                      </div>
                    </div>

                    {/* Backend */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-28 h-28 bg-[#111] border-2 border-white/10 rounded-2xl flex flex-col items-center justify-center shadow-xl">
                        <Server className="w-10 h-10 mb-2 text-gray-400" />
                        <span className="text-xs font-bold">Express</span>
                      </div>
                      <div className="text-[10px] text-white/30 font-mono">API & Storage</div>
                    </div>

                    <div className="px-6 flex items-center">
                      <ArrowRight className="text-white/10" size={32} />
                    </div>

                    {/* LangGraph Orchestrator */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-40 h-40 bg-[#050505] border-4 border-[#00ffcc] rounded-3xl flex flex-col items-center justify-center shadow-[0_0_50px_rgba(0,255,204,0.15)] relative group">
                        <div className="absolute -top-3 px-3 py-0.5 bg-[#00ffcc] text-black text-[10px] font-black rounded-full shadow-lg">CORE ORCHESTRATOR</div>
                        <div className="absolute inset-0 bg-[#00ffcc]/5 rounded-3xl animate-pulse" />
                        <Cpu className="w-14 h-14 mb-3 text-[#00ffcc]" />
                        <span className="text-sm font-black tracking-tight">LangGraph</span>
                        <div className="text-[9px] text-[#00ffcc]/60 mt-1 font-mono font-bold uppercase tracking-tighter">Chain State Machine</div>
                      </div>
                      <div className="text-[10px] text-[#00ffcc]/40 font-mono font-bold">Multi-Node Workflow</div>
                    </div>

                    <div className="px-6 flex items-center">
                      <ArrowRight className="text-white/10" size={32} />
                    </div>

                    {/* External Tools */}
                    <div className="flex flex-col gap-2">
                      {[
                        { name: "RPC Node", icon: <Activity size={12}/> },
                        { name: "Etherscan", icon: <Globe size={12}/> },
                        { name: "Tenderly", icon: <Database size={12}/> }
                      ].map((tool, i) => (
                        <div key={i} className="bg-[#111] border border-white/10 px-4 py-3 rounded-xl text-xs flex items-center gap-3 w-40 hover:border-[#00ffcc]/50 transition-colors">
                          <span className="text-[#00ffcc]">{tool.icon}</span>
                          <span className="font-bold">{tool.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* LangGraph Capabilities */}
                  <div className="mt-16 flex justify-center gap-12">
                    {[
                      { label: "STATE MANAGEMENT", desc: "Atomic graph memory" },
                      { label: "LOGIC ENFORCEMENT", desc: "Fact-check loop" },
                      { label: "ASYNC EXECUTION", desc: "Parallel tool calls" }
                    ].map((feature, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#00ffcc] shadow-[0_0_5px_#00ffcc]" />
                          <span className="text-[11px] font-black text-white/80 tracking-widest">{feature.label}</span>
                        </div>
                        <span className="text-[9px] text-white/30 font-mono">{feature.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {slide.type === "columns" && (
                <div className="grid grid-cols-3 gap-6 h-full items-center">
                  {slide.columns.map((col, i) => (
                    <div key={i} className="h-64 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-[#222] p-6 rounded-lg hover:border-[#00ffcc]/50 transition-colors group">
                      <div className="mb-4">{col.icon}</div>
                      <h3 className="text-lg font-bold text-white mb-4 group-hover:text-[#00ffcc] transition-colors">{col.title}</h3>
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

              {slide.type === "roadmap" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col justify-center">
                  <div className="grid grid-cols-2 gap-6 py-4">
                    {slide.items.map((it, i) => (
                      <div key={i} className="p-6 rounded-xl bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-[#222] hover:border-[#00ffcc]/40 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-[#00ffcc] font-mono tracking-widest uppercase">ROADMAP_{i + 1}</div>
                          <div className="w-2 h-2 rounded-full bg-[#00ffcc]/60" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2 tracking-tight">{it.title}</h3>
                        <p className="text-sm text-white/60 leading-relaxed">{it.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {slide.type === "summary" && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col justify-center max-w-2xl mx-auto w-full">
                  <div className="mb-8">
                    <h3 className="text-2xl text-white mb-6 leading-relaxed">"{slide.summary}"</h3>
                    <div className="space-y-4">
                      <div className="text-xs text-[#00ffcc] uppercase tracking-widest mb-2">Key Takeaways</div>
                      {slide.steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 bg-[#111] border border-[#222] rounded">
                          <div className="w-6 h-6 rounded-full bg-[#222] flex items-center justify-center text-xs text-gray-500">{i + 1}</div>
                          <span className="text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-8 pt-8 border-t border-[#222] text-center">
                    <div className="text-[#00ffcc] animate-pulse font-bold text-lg">{slide.closing}</div>
                  </div>
                </div>
              )}

              {slide.type === "qa" && (
                <div className="flex flex-col items-center justify-center h-full space-y-12 text-center">
                  <div className="relative">
                    <div className="absolute -inset-8 bg-[#00ffcc] opacity-10 blur-3xl rounded-full animate-pulse" />
                    <h3 className="text-8xl font-black text-white tracking-tighter relative z-10 uppercase italic">Q&A</h3>
                  </div>
                  <div className="text-4xl font-black text-[#00ffcc] animate-pulse tracking-tight uppercase">{slide.closing}</div>
                </div>
              )}
            </div>
          </div>

          {showNotes && (
            <div className="bg-[#080808] border-t border-[#222] p-4 h-24 overflow-y-auto shrink-0">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Presenter Notes (EN)</div>
              <div className="text-sm text-gray-400 font-sans leading-relaxed whitespace-pre-wrap">{slide.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
