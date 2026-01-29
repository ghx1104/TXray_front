"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Database, Search, Cpu, FileText, CheckCircle, ChevronRight, Terminal, ChevronDown, ChevronUp, Box, Layers, Zap } from "lucide-react";
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

export const WorkflowVisualizer = ({ events = [], defaultExpanded = true }: { events: any[], defaultExpanded?: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const steps = [
    { 
      id: 'rpc', 
      label: 'RPC NETWORK LAYER', 
      types: ['rpc_done'],
      getDetails: (evs: any[]) => {
        const done = evs.find(e => e.type === 'rpc_done');
        if (!done) return null;
        return [
          { label: 'STATUS', value: 'COMMITTED', color: 'text-[#00ffcc]' },
          { label: 'BLOCK_NUM', value: done.payload?.blockNumber || 'FETCHED' },
          { label: 'LATENCY', value: 'OPTIMAL' }
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
        return [
          { label: 'CONTRACT_ABI', value: done.payload?.abi ? 'VERIFIED_OK' : 'UNVERIFIED', color: done.payload?.abi ? 'text-[#00ffcc]' : 'text-orange-400' },
          { label: 'INTERNAL_TXS', value: `${done.payload?.internalTxCount || 0} FLOWS_IDENTIFIED` },
          { label: 'SOURCE_CODE', value: done.payload?.abi ? 'ACCESSIBLE' : 'HIDDEN' }
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
        
        if (done.payload?.hasTrace) {
          return [
            { label: 'VM_STATUS', value: 'REPLAY_SUCCESS', color: 'text-[#00ffcc]' },
            { label: 'CALL_STACK', value: 'DEEP_TRACE_COLLECTED' }
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

                return (
                  <motion.div 
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-6 relative z-10"
                  >
                    <div className="flex flex-col items-center">
                      <StepIcon type={step.id} active={isActive} completed={isCompleted} />
                    </div>

                    <div className="flex-1 pt-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn(
                          "text-xs font-black tracking-[0.1em] transition-colors duration-500 uppercase",
                          isActive ? "text-[#00ffcc]" : isCompleted ? "text-white/90" : "text-white/20"
                        )}>
                          {step.label}
                        </span>
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
    </div>
  );
};
