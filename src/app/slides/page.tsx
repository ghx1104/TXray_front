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
      "Explanations without evidence are untrustworthy",
    ],
    rightTitle: "Our Solution)",
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
    title: "Live Demo Walkthrough",
    type: "demo",
    bullets: [
      "Streaming output (Token / SSE)",
      "Click to drill down per step (Modal)",
      "Invocation Flow for call trace (Tree View)",
    ],
    script: ["1. Paste Tx Hash", "2. Watch Timeline Run", "3. Open Tenderly Flow", "4. View RPC Details"],
    notes:
      "(Demo) As the timeline runs, the backend fetches RPC/Etherscan/Tenderly data in parallel. The UI streams progress and content in real time, and you can click each step to drill down into the evidence (call trace, ABI, internal txs).",
  },
  {
    id: 4,
    title: "Architecture & Data Flow",
    type: "diagram",
    highlight: "Evidence-first Pipeline",
    events: ["rpc_done", "etherscan_done", "tenderly_done", "token", "message_end"],
    notes:
      "The system uses SSE (Server-Sent Events) so the backend can push progress updates to the frontend over a single HTTP stream. Express orchestrates RPC/Etherscan/Tenderly and emits events like rpc_done / tenderly_done for real-time rendering.",
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
    title: "Development Challenges",
    type: "summary",
    summary: "What went wrong during development (and how we fixed it).",
    steps: [
      "LLM struggled with complex nested call traces (50–150 internal calls)",
      "LangGraph state dropped fields not declared in StateAnnotation",
      "Verification false positives when internal ETH flows were missing from ground truth",
      "x402 header must be base64-encoded JSON (raw JSON caused invalid character errors)",
      "Call trace display showed undefined due to wrong trace root passed to flattener",
      "Old txs failed on non-archive public RPCs (receipt not found)",
      "Conversation context issues (empty messages / streaming fallback needed)",
    ],
    closing: "Outcome: more robust pipeline and clearer evidence alignment.",
    notes:
      "### 1. LLM Struggling with Complex Call Traces (Main Challenge)\n\n**Problem**: For transactions with many nested contract calls (e.g. 50–150 internal calls), the LLM often failed to follow the execution flow. It would infer generic behavior (e.g. “swap step”, “token transfer”) instead of using the actual call structure, and sometimes made up flows that did not match the trace.\n\n**Why it happens**:\n- The call trace is a recursive tree (CALL → subcalls → sub-subcalls) while the model sees a flattened list\n- It has no stable mapping from selectors to function names, so it guesses from common patterns\n- Cross-call state and side effects (e.g. WETH unwrap → ETH transfer) are easy to miss\n- Long sequences cause the model to drop or compress parts of the trace\n\n**What we tried**:\n- **Address enrichment** — Fetch labels/ABI for addresses in the trace so the model sees “Uniswap V3 Router” instead of `0x68b346...`\n- **Structured prompts** — Split trace data into clear sections: token flows, internal calls, Etherscan internal txs, Tenderly trace\n- **Call trace explanation node** — A separate LLM pass that explains each call step-by-step, then feeds that into the main draft as reference\n- **Fact verification node** — Compare the draft with token flows and call trace to catch hallucinations\n\n**Outcome**: The multi-node pipeline (call trace enrich → explain → draft → verify) improved consistency, but complex multi-hop MEV txs still require careful prompting and verification. The model remains better at summarizing high-level flows than at correctly inferring every internal step from raw traces.\n\n---\n\n### 2. LangGraph State Dropping Critical Data\n\n**Problem**: Call trace explanation and Tenderly trace were produced correctly, but the draft node often received empty or incomplete data. The LLM sometimes reported \"No call trace available\" despite successful trace fetching.\n\n**Root cause**: LangGraph's `StateAnnotation` only declared a subset of fields. Any field not listed was dropped when state passed between nodes.\n\n**Solution**: Extended `StateAnnotation` to include every field used in the pipeline (`tenderlyCallTrace`, `callTraceExplanation`, `etherscanInternalTxs`, `addressLabels`, etc.), so state is preserved across nodes.\n\n---\n\n### 3. Fact Verification False Positives\n\n**Problem**: The verification step flagged correct statements as errors. For example, when the user received 0.506 ETH from a WETH unwrap (via internal call), the verifier said \"wrong: user received ETH\" because the ground truth only used top-level `tx.value` (which was 0).\n\n**Root cause**: Ground truth was built only from token flows and top-level ETH. Internal ETH flows (e.g. WETH withdraw) were ignored.\n\n**Solution**: Updated `buildGroundTruth` to include internal ETH flows from Etherscan internal txs and Tenderly trace, and relaxed the verify prompt so it does not flag correct statements when the data supports them.\n\n---\n\n### 4. x402 Payment Header Parsing\n\n**Problem**: The frontend sent payment data in the `X-PAYMENT` header but got \"Invalid character\" errors.\n\n**Root cause**: The x402 middleware expects **base64-encoded JSON** in the header, not raw JSON.\n\n**Solution**: Base64-encode the payment object before putting it in the header and ensure the structure matches the spec (`x402Version`, `scheme`, `network`, `payload` with `signature` and `authorization`).\n\n---\n\n### 5. Call Trace Display Showing `undefined`\n\n**Problem**: CLI output showed `undefined: undefined... → undefined...` instead of addresses and function names.\n\n**Root cause**: `extractAllCallsForDisplay` was called with `tenderly.trace` (array) instead of the root call `tenderly.trace[0]`.\n\n**Solution**: Pass `tenderly.trace[0]` when flattening the trace for display.\n\n---\n\n### 6. Old Transactions Failing on Public RPCs\n\n**Problem**: Some historical transactions (e.g. from 2022) failed with `TransactionReceiptNotFoundError`.\n\n**Root cause**: Many free RPCs prune old state and are not archive nodes.\n\n**Solution**: Documented this limitation and recommended paid archive RPC or Etherscan proxy fallback for historical queries.\n\n---\n\n### 7. Agent Not Remembering Conversation Context\n\n**Problem**: In multi-turn chat, the agent sometimes returned empty replies or ignored previous messages.\n\n**Root cause**: Weak system prompt around chat history, empty messages passed to the LLM, and streaming sometimes failing to capture the final response.\n\n**Solution**: Strengthened the system prompt, filtered out empty messages, and added a fallback to capture `finalResponse` from `on_chain_end` when streaming missed it.",
  },
  {
    id: 7,
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
      "In summary, TXray turns tx hashes into readable reports with verifiable evidence. Next, we’ll add explorer-grade views (balance changes + logs), build shareable report links with caching, and further optimize large trace rendering performance. Thanks!",
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

