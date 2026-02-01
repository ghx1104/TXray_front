"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, Search, Cpu, FileText, CheckCircle, ChevronDown, ChevronUp, ChevronRight,
  Box, Layers, X, Copy, Eye, Code, ListTree, Database, Terminal,
  ArrowRight, CornerDownRight, AlertCircle, Info
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIconProps {
  type: string;
  active: boolean;
  completed: boolean;
}

const StepIcon = ({ type, active, completed }: StepIconProps) => {
  const icons: Record<string, any> = {
    rpc: Box,
    etherscan: Search,
    tenderly: Layers,
    draft: Cpu,
    conclusion: FileText,
  };

  const Icon = icons[type] || Activity;

  return (
    <div className={cn(
      "p-2.5 rounded-xl transition-all duration-500 border relative",
      active ? "bg-[#00ffcc] text-black border-[#00ffcc] scale-110 shadow-[0_0_20px_rgba(0,255,204,0.4)]" : 
      completed ? "bg-[#00ffcc]/10 text-[#00ffcc] border-[#00ffcc]/20" : "bg-white/5 text-white/20 border-white/5"
    )}>
      {active && (
        <motion.div 
          layoutId="active-glow"
          className="absolute inset-0 rounded-xl bg-[#00ffcc] blur-md opacity-50 -z-10"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <Icon size={18} />
    </div>
  );
};

/**
 * 递归渲染 Call Trace 节点（Invocation Flow）
 */
const CallTraceNode = ({ 
  call, 
  depth = 0, 
  isLast = false,
  onCopy 
}: { 
  call: any; 
  depth?: number; 
  isLast?: boolean;
  onCopy: (text: string) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasSubcalls = Array.isArray(call.calls) && call.calls.length > 0;

  // 根据类型对着色
  const getTypeStyles = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'DELEGATECALL': return 'text-orange-400 bg-orange-400/10';
      case 'STATICCALL': return 'text-blue-400 bg-blue-400/10';
      case 'CREATE':
      case 'CREATE2': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-[#00ffcc] bg-[#00ffcc]/10';
    }
  };

  const typeStyle = getTypeStyles(call.type);
  const isError = !!call.error;

  // 尝试解析函数名
  const getFuncName = (c: any) => {
    if (c.function && c.function !== 'fallback') return c.function;
    if (c.input && c.input !== '0x') {
      const selector = c.input.slice(0, 10);
      if (selector === '0xa9059cbb') return 'transfer(address,uint256)';
      if (selector === '0x23b872dd') return 'transferFrom(address,address,uint256)';
      return `[${selector}]`;
    }
    return 'fallback';
  };

  const funcName = getFuncName(call);

  return (
    <div className="group/node">
      <div 
        className={cn(
          "flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors relative group",
          isError && "bg-red-500/5"
        )}
        style={{ marginLeft: `${depth * 16}px` }}
      >
        {/* Phalcon 风格的垂直引导线 */}
        {depth > 0 && (
          <div className="absolute left-[-10px] top-0 bottom-0 w-[1px] bg-white/10 group-hover:bg-[#00ffcc]/30 transition-colors" />
        )}
        {depth > 0 && (
          <div className="absolute left-[-10px] top-[18px] w-2 h-[1px] bg-white/10 group-hover:bg-[#00ffcc]/30 transition-colors" />
        )}

        {/* 展开/收起按钮 */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5 z-10">
          {hasSubcalls ? (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="hover:text-[#00ffcc] text-white/30 transition-colors"
            >
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <div className="w-1 h-1 rounded-full bg-white/10" />
          )}
        </div>

        {/* 调用信息 */}
        <div className="flex-1 min-w-0 font-mono text-[11px] leading-tight">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {/* 类型标签 - 更小巧 */}
            <span className={cn("px-1 py-0.5 rounded-[3px] text-[8px] font-black uppercase tracking-tighter shrink-0 leading-none", typeStyle)}>
              {call.type?.slice(0, 4) || 'CALL'}
            </span>

            {/* 函数名 */}
            <span className={cn(
              "font-bold truncate",
              isError ? "text-red-400" : "text-white/90"
            )}>
              {funcName}
            </span>

            {/* 发送方 -> 接收方 - 增加标签感 */}
            <div className="flex items-center gap-1 text-white/20 text-[10px]">
              <span className="hover:text-white/60 transition-colors cursor-help" title={call.from}>{call.from?.slice(0, 6)}</span>
              <ArrowRight size={8} className="shrink-0 opacity-50" />
              <span className="text-white/40 hover:text-[#00ffcc] transition-colors cursor-help font-bold" title={call.to}>{call.to?.slice(0, 6)}</span>
            </div>

            {/* Value */}
            {call.value && call.value !== '0' && call.value !== '0x0' && (
              <span className="text-yellow-400/80 text-[9px] px-1 bg-yellow-400/5 rounded border border-yellow-400/10">
                {parseFloat(parseInt(call.value, 16).toString()) / 1e18} ETH
              </span>
            )}

            {/* Gas - 移到同一行末尾 */}
            <span className="text-white/10 text-[9px] ml-auto">
              {call.gasUsed ? parseInt(call.gasUsed, 16).toLocaleString() : '0'} gas
            </span>

            {/* 复制 */}
            <button 
              onClick={() => onCopy(JSON.stringify(call, null, 2))}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all text-white/20"
            >
              <Copy size={10} />
            </button>
          </div>

          {/* 错误提示 */}
          {isError && (
            <div className="mt-1 flex items-center gap-1 text-red-400 text-[9px] bg-red-400/10 px-1.5 py-0.5 rounded border border-red-400/20 w-fit">
              <AlertCircle size={10} />
              <span>{call.error}</span>
            </div>
          )}
        </div>
      </div>

      {/* 子调用递归 */}
      <AnimatePresence initial={false}>
        {hasSubcalls && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-l border-white/5 ml-[7px]"
          >
            {call.calls.map((subcall: any, sIdx: number) => (
              <CallTraceNode 
                key={sIdx} 
                call={subcall} 
                depth={depth + 1} 
                isLast={sIdx === call.calls.length - 1}
                onCopy={onCopy}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const WorkflowVisualizer = ({ events = [], defaultExpanded = true }: { events: any[], defaultExpanded?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeModal, setActiveModal] = useState<"rpc" | "etherscan" | "tenderly" | null>(null);
  const [tenderlyTab, setTenderlyTab] = useState<"flow" | "list" | "raw">("flow");
  const [etherscanTab, setEtherscanTab] = useState<"info" | "abi" | "source" | "internal">("info");
  const [expandedCallIdxs, setExpandedCallIdxs] = useState<Set<number>>(() => new Set());
  const [rawText, setRawText] = useState<string | null>(null);

  const rpcDone = useMemo(() => events.find((e) => e.type === "rpc_done"), [events]);
  const etherscanDone = useMemo(() => events.find((e) => e.type === "etherscan_done"), [events]);
  const tenderlyDone = useMemo(() => events.find((e) => e.type === "tenderly_done"), [events]);

  const rpcPayload = rpcDone?.payload ?? null;
  const etherscanPayload = etherscanDone?.payload ?? null;
  const tenderlyPayload = tenderlyDone?.payload ?? null;

  const tenderlyCalls: any[] = Array.isArray(tenderlyPayload?.calls) ? tenderlyPayload.calls : [];

  const hasRpcData = !!rpcPayload;
  const hasEtherscanData = !!etherscanPayload;
  const hasTenderlyData = !!tenderlyPayload?.trace;

  // 修正 Tenderly Trace 的根节点路径
  const tenderlyTrace = useMemo(() => {
    if (!tenderlyPayload?.trace) return null;
    // 后端返回的是 { gasUsed, status, trace: [...] }
    // 我们需要的是 trace 数组中的第一个元素（真正的根调用）
    const rootTrace = tenderlyPayload.trace.trace;
    return Array.isArray(rootTrace) ? rootTrace[0] : rootTrace;
  }, [tenderlyPayload]);

  const getPreviewText = (data: any) => {
    if (!data) return null;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "[unserializable data]";
    }
  };

  const steps = [
    { 
      id: 'rpc', 
      label: 'RPC NETWORK LAYER', 
      types: ['rpc_done'],
      getDetails: (evs: any[]) => {
        const done = evs.find(e => e.type === 'rpc_done');
        if (!done) return null;
        const blockNumber = done.payload?.blockNumber ?? done.payload?.rawTx?.blockNumber ?? 'FETCHED';
        return [
          { label: 'STATUS', value: 'COMMITTED', color: 'text-[#00ffcc]' },
          { label: 'BLOCK_NUM', value: blockNumber }
        ];
      }
    },
    { 
      id: 'etherscan', 
      label: 'ETHERSCAN INTELLIGENCE', 
      types: ['etherscan_start', 'etherscan_done'],
      getDetails: (evs: any[]) => {
        const start = evs.some(e => e.type === 'etherscan_start');
        const done = evs.find(e => e.type === 'etherscan_done');
        if (!done) return start ? [{ label: 'PROGRESS', value: 'INDEXING_CHAIN...', animate: true }] : null;
        const hasAbi = !!(done.payload?.contractABI && Array.isArray(done.payload.contractABI) && done.payload.contractABI.length > 0);
        const internalTxCount = Array.isArray(done.payload?.internalTxs) ? done.payload.internalTxs.length : (done.payload?.internalTxCount || 0);
        return [
          { label: 'CONTRACT_ABI', value: hasAbi ? 'VERIFIED_OK' : 'UNVERIFIED', color: hasAbi ? 'text-[#00ffcc]' : 'text-orange-400' },
          { label: 'INTERNAL_TXS', value: `${internalTxCount} FLOWS_IDENTIFIED` },
          { label: 'SOURCE_CODE', value: done.payload?.contractSource ? 'ACCESSIBLE' : 'HIDDEN' }
        ];
      }
    },
    { 
      id: 'tenderly', 
      label: 'TENDERLY SIMULATION', 
      types: ['tenderly_start', 'tenderly_done'],
      getDetails: (evs: any[]) => {
        const start = evs.some(e => e.type === 'tenderly_start');
        const done = evs.find(e => e.type === 'tenderly_done');
        if (!done) return start ? [{ label: 'SIMULATION', value: 'RUNNING_VM...', animate: true }] : null;

        const hasTrace = !!done.payload?.trace;
        const callsCount = Array.isArray(done.payload?.calls) ? done.payload.calls.length : 0;

        if (hasTrace) {
          return [
            { label: 'VM_STATUS', value: 'REPLAY_SUCCESS', color: 'text-[#00ffcc]' },
            { label: 'CALL_STACK', value: `${callsCount} CALLS_EXTRACTED` }
          ];
        } else {
          return [
            { label: 'STATUS', value: 'SKIPPED / UNAVAILABLE', color: 'text-white/40' },
            { label: 'REASON', value: 'NOT_CONFIGURED_OR_LIMIT' }
          ];
        }
      }
    },
    { 
      id: 'draft', 
      label: 'NEURAL PATTERN RECOGNITION', 
      types: ['draft_start', 'draft_done'],
      getDetails: (evs: any[]) => {
        const start = evs.some(e => e.type === 'draft_start');
        const done = evs.some(e => e.type === 'draft_done');
        if (done) return [{ label: 'AI_AGENT', value: 'PATTERN_RECOGNIZED', color: 'text-[#00ffcc]' }];
        if (start) return [{ label: 'NEURAL_ENGINE', value: 'ANALYZING_BEHAVIOR...', animate: true }];
        return null;
      }
    },
    { 
      id: 'conclusion', 
      label: 'FINAL FORENSIC REPORT', 
      types: ['done'],
      getDetails: (evs: any[]) => {
        const done = evs.find(e => e.type === 'done');
        if (!done) return null;
        return [
          { label: 'REPORT_ID', value: `TX-${Math.floor(Math.random()*10000)}` },
          { label: 'INTEGRITY', value: 'VERIFIED', color: 'text-[#00ffcc]' }
        ];
      }
    },
  ];

  const currentStepIndex = steps.findLastIndex(step => 
    events.some(e => step.types.includes(e.type))
  );

  const isAllDone = events.some(e => e.type === 'done' || e.type === 'message_end');

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const toggleCallExpanded = (idx: number) => {
    setExpandedCallIdxs(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="flex flex-col w-full glass-panel rounded-3xl overflow-hidden border border-white/5 transition-all duration-500">
      {/* Header / Toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-1.5 h-1.5 rounded-full", isAllDone ? "bg-[#00ffcc]" : "bg-[#00ffcc] animate-pulse shadow-[0_0_10px_#00ffcc]")} />
          <h3 className="text-[10px] font-black tracking-[0.3em] uppercase text-[#00ffcc]">Analysis Execution Timeline</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-mono text-white/20 uppercase">
            {isAllDone ? 'SEQUENCE COMPLETE' : `${events.length} EVENTS RECORDED`}
          </span>
          {isExpanded ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="p-8 space-y-10 relative">
              {/* Vertical line connector */}
              <div className="absolute left-[41px] top-12 bottom-12 w-px bg-gradient-to-b from-[#00ffcc]/40 via-[#00ffcc]/10 to-transparent" />

              {steps.map((step, idx) => {
                const isCompleted = events.some(e => 
                  (step.id === 'rpc' && e.type === 'rpc_done') ||
                  (step.id === 'etherscan' && e.type === 'etherscan_done') ||
                  (step.id === 'tenderly' && e.type === 'tenderly_done') ||
                  (step.id === 'draft' && e.type === 'draft_done') ||
                  (step.id === 'conclusion' && e.type === 'done')
                );
                
                const isStarted = events.some(e => step.types.includes(e.type));
                const lastEvent = events[events.length-1];
                const isActive = !isAllDone && (idx === currentStepIndex || (idx > 0 && lastEvent?.type && steps[idx-1].id === lastEvent.type.split('_')[0]));
                const details = step.getDetails(events);

                if (!isStarted && !isCompleted && idx > currentStepIndex + 1) return null;

                const hasDetailData = (step.id === 'rpc' && hasRpcData) || 
                                     (step.id === 'etherscan' && hasEtherscanData) || 
                                     (step.id === 'tenderly' && hasTenderlyData);

                return (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex gap-6 relative z-10",
                      isCompleted && hasDetailData && "cursor-pointer group/step"
                    )}
                    onClick={() => {
                      if (isCompleted && hasDetailData) {
                        setRawText(null);
                        setExpandedCallIdxs(new Set());
                        if (step.id === "tenderly") {
                          setTenderlyTab("flow");
                          setActiveModal("tenderly");
                        } else if (step.id === "rpc") {
                          setActiveModal("rpc");
                        } else if (step.id === "etherscan") {
                          setEtherscanTab("info");
                          setActiveModal("etherscan");
                        }
                      }
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <StepIcon type={step.id} active={isActive} completed={isCompleted} />
                    </div>

                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-xs font-black tracking-[0.1em] transition-colors duration-500 uppercase",
                            isActive ? "text-[#00ffcc]" : isCompleted ? "text-white/90" : "text-white/20"
                          )}>
                            {step.label}
                          </span>

                          {isCompleted && hasDetailData && (
                            <div className="opacity-0 group-hover/step:opacity-100 transition-opacity flex items-center gap-1.5 rounded-md border border-[#00ffcc]/20 bg-[#00ffcc]/10 px-2 py-1 text-[9px] font-mono text-[#00ffcc]">
                              <Eye size={10} />
                              DETAILS
                            </div>
                          )}
                        </div>
                        {isCompleted && <CheckCircle size={14} className="text-[#00ffcc]" />}
                        {isActive && <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-[10px] font-mono text-[#00ffcc]">PROCESSING</motion.div>}
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        {details ? (
                          details.map((detail, dIdx) => (
                            <motion.div 
                              key={dIdx} 
                              initial={{ opacity: 0, y: 5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex items-center justify-between font-mono text-[9px] bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 hover:bg-white/[0.06] transition-colors"
                            >
                              <div className="flex items-center gap-2 text-white/40">
                                <div className="w-1 h-1 rounded-full bg-white/20" />
                                {detail.label}
                              </div>
                              <div className={cn("font-bold", detail.color || "text-white/70", detail.animate && "animate-pulse")}>
                                {detail.value}
                              </div>
                            </motion.div>
                          ))
                        ) : !isStarted ? (
                          <div className="text-[9px] font-mono text-white/5 italic px-3">Waiting for sequence...</div>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-6xl max-h-[90vh] rounded-2xl border border-white/10 bg-[#0b0f16]/95 overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  {activeModal === 'rpc' && <Box size={16} className="text-[#00ffcc]" />}
                  {activeModal === 'etherscan' && <Search size={16} className="text-[#00ffcc]" />}
                  {activeModal === 'tenderly' && <Layers size={16} className="text-[#00ffcc]" />}
                  <div className="text-xs font-black tracking-[0.12em] uppercase text-white/90">
                    {activeModal === 'rpc' && "RPC Network Layer Data"}
                    {activeModal === 'etherscan' && "Etherscan Intelligence Data"}
                    {activeModal === 'tenderly' && "Tenderly Invocation Flow"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={16} className="text-white/50" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 shrink-0 overflow-x-auto no-scrollbar">
                {activeModal === 'rpc' && (
                  <div className="text-[10px] font-black text-[#00ffcc]/60 px-2 uppercase tracking-widest">RAW_TX_DATA</div>
                )}
                
                {activeModal === 'etherscan' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEtherscanTab("info")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        etherscanTab === "info" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <Info size={14} /> INFO
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtherscanTab("abi")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        etherscanTab === "abi" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <Terminal size={14} /> ABI
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtherscanTab("source")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        etherscanTab === "source" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <Code size={14} /> SOURCE
                    </button>
                    <button
                      type="button"
                      onClick={() => setEtherscanTab("internal")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        etherscanTab === "internal" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <ListTree size={14} /> INTERNAL_TXS
                    </button>
                  </>
                )}

                {activeModal === 'tenderly' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTenderlyTab("flow")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        tenderlyTab === "flow" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <ListTree size={14} /> CALL_FLOW
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenderlyTab("list")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        tenderlyTab === "list" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <Terminal size={14} /> CALL_LIST
                    </button>
                    <button
                      type="button"
                      onClick={() => setTenderlyTab("raw")}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border transition-colors shrink-0",
                        tenderlyTab === "raw" ? "bg-[#00ffcc]/10 border-[#00ffcc]/20 text-[#00ffcc]" : "bg-white/[0.02] border-white/10 text-white/50 hover:bg-white/[0.04]"
                      )}
                    >
                      <Code size={14} /> RAW_TRACE
                    </button>
                  </>
                )}

                <div className="flex-1" />
                
                <button
                  type="button"
                  onClick={() => {
                    const data = activeModal === 'rpc' ? rpcPayload : 
                                activeModal === 'etherscan' ? etherscanPayload : 
                                tenderlyPayload?.trace;
                    void copyToClipboard(JSON.stringify(data, null, 2));
                  }}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-mono border border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.04] transition-colors"
                >
                  <Copy size={14} />
                  COPY_JSON
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-auto flex-1 bg-black/20 custom-scrollbar">
                {activeModal === 'rpc' && (
                  <pre className="text-[10px] leading-relaxed font-mono text-white/70 whitespace-pre-wrap break-words">
                    {getPreviewText(rpcPayload)}
                  </pre>
                )}

                {activeModal === 'etherscan' && (
                  <div className="space-y-4">
                    {etherscanTab === 'info' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
                          <h4 className="text-[10px] font-black text-[#00ffcc]/60 uppercase tracking-widest">Address Labels</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries(etherscanPayload?.addressLabels || {}).map(([addr, label]: [string, any]) => (
                              <div key={addr} className="flex justify-between text-[10px] font-mono group/item">
                                <span className="text-white/40 group-hover/item:text-white/60 transition-colors">{addr}</span>
                                <span className="text-[#00ffcc]">{label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-2">
                          <h4 className="text-[10px] font-black text-[#00ffcc]/60 uppercase tracking-widest">Gas Context</h4>
                          <pre className="text-[10px] font-mono text-white/60">
                            {getPreviewText(etherscanPayload?.gasContext)}
                          </pre>
                        </div>
                      </div>
                    )}
                    {etherscanTab === 'abi' && (
                      <pre className="text-[10px] leading-relaxed font-mono text-white/70 whitespace-pre-wrap break-words">
                        {getPreviewText(etherscanPayload?.contractABI)}
                      </pre>
                    )}
                    {etherscanTab === 'source' && (
                      <pre className="text-[10px] leading-relaxed font-mono text-white/70 whitespace-pre-wrap break-words">
                        {etherscanPayload?.contractSource || "No source code available."}
                      </pre>
                    )}
                    {etherscanTab === 'internal' && (
                      <pre className="text-[10px] leading-relaxed font-mono text-white/70 whitespace-pre-wrap break-words">
                        {getPreviewText(etherscanPayload?.internalTxs)}
                      </pre>
                    )}
                  </div>
                )}

                {activeModal === 'tenderly' && (
                  <div className="space-y-1">
                    {tenderlyTab === 'flow' ? (
                      tenderlyTrace ? (
                        <div className="min-w-fit pb-10">
                          <CallTraceNode 
                            call={tenderlyTrace} 
                            onCopy={(t) => copyToClipboard(t)}
                          />
                        </div>
                      ) : (
                        <div className="text-xs text-white/40 font-mono flex items-center gap-2 p-10 justify-center">
                          <AlertCircle size={14} />
                          No trace data available for flow visualization.
                        </div>
                      )
                    ) : tenderlyTab === 'list' ? (
                      <div className="space-y-2 pb-10">
                        {tenderlyCalls.length === 0 ? (
                          <div className="text-xs text-white/40 font-mono flex items-center gap-2 p-10 justify-center">
                            <Info size={14} />
                            No flat call list available.
                          </div>
                        ) : (
                          tenderlyCalls.map((call, idx) => {
                            const isOpen = expandedCallIdxs.has(idx);
                            return (
                              <div key={idx} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                                <button
                                  onClick={() => toggleCallExpanded(idx)}
                                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/[0.03] transition-colors"
                                >
                                  <div className="min-w-0">
                                    <div className="text-[11px] font-mono text-white/80 truncate">
                                      {idx + 1}. {call?.from?.slice(0, 10)} → {call?.to?.slice(0, 10)}
                                    </div>
                                    <div className="text-[10px] font-mono text-white/40 truncate">
                                      {call?.function || call?.type || "CALL"}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(JSON.stringify(call, null, 2));
                                      }}
                                      className="p-1.5 hover:bg-white/10 rounded transition-colors text-white/20"
                                    >
                                      <Copy size={12} />
                                    </button>
                                    <ChevronDown size={16} className={cn("text-white/40 transition-transform", isOpen && "rotate-180")} />
                                  </div>
                                </button>
                                <AnimatePresence>
                                  {isOpen && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="border-t border-white/10 bg-black/40">
                                      <pre className="p-4 text-[10px] font-mono text-white/60 overflow-x-auto">
                                        {getPreviewText(call)}
                                      </pre>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : (
                      <pre className="text-[10px] leading-relaxed font-mono text-white/70 whitespace-pre-wrap break-words">
                        {getPreviewText(tenderlyPayload?.trace)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
