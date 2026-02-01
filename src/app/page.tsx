"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Shield, Terminal, Globe, ChevronRight, Cpu, Search, Activity, Database } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { WorkflowVisualizer } from "@/components/WorkflowVisualizer";
import { Message, ProgressEvent } from "@/types";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdate: number;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('txray_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
        if (parsed.length > 0) {
          setCurrentConvId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to load conversations', e);
      }
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('txray_conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentConvId, conversations]);

  const currentConv = conversations.find(c => c.id === currentConvId);
  const messages = currentConv?.messages || [];

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isAnalyzing) return;

    // Use a local variable to store the target conversation ID
    let targetConvId = currentConvId;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    // Add user message to current conversation
    setConversations(prev => {
      // If there's no current conversation, create one
      if (!targetConvId) {
        targetConvId = `temp_${Date.now()}`;
        const newConv: Conversation = {
          id: targetConvId,
          title: messageText.slice(0, 20) + (messageText.length > 20 ? "..." : ""),
          messages: [userMessage],
          lastUpdate: Date.now()
        };
        setCurrentConvId(targetConvId);
        return [newConv, ...prev];
      }

      const updated = prev.map(c => 
        c.id === targetConvId 
          ? { ...c, messages: [...c.messages, userMessage], lastUpdate: Date.now() }
          : c
      );
      return updated;
    });

    setInput("");
    setIsAnalyzing(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      status: "loading",
      progress: [],
    };

    // Add assistant placeholder
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === targetConvId
          ? { ...c, messages: [...c.messages, assistantMessage], lastUpdate: Date.now() }
          : c
      );
      return updated;
    });

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageText,
          conversationId: targetConvId && !targetConvId.startsWith('temp_') ? targetConvId : undefined
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const block of lines) {
          const eventLines = block.split("\n");
          let eventType = "message";
          let data = null;

          for (const line of eventLines) {
            if (line.startsWith("event: ")) {
              eventType = line.replace("event: ", "").trim();
            } else if (line.startsWith("data: ")) {
              try {
                data = JSON.parse(line.replace("data: ", "").trim());
              } catch (e) {
                console.error("Failed to parse SSE data", e);
              }
            }
          }

          // Log received SSE events (skip token to avoid noise)
          if (data && eventType !== 'token') {
            const dataStr = JSON.stringify(data).slice(0, 200);
            console.log(`[Frontend SSE] event=${eventType} data=${dataStr}${dataStr.length >= 200 ? '...(truncated)' : ''}`);
          }

          // Capture session event to update conversationId
          if (eventType === 'session' && data?.conversationId) {
            const newConvId = data.conversationId;
            setConversations(prev => {
              // If this is a new conversation, create it
              if (!prev.find(c => c.id === newConvId)) {
                const newConv: Conversation = {
                  id: newConvId,
                  title: messageText.slice(0, 20) + (messageText.length > 20 ? "..." : ""),
                  messages: [userMessage, assistantMessage],
                  lastUpdate: Date.now()
                };
                setCurrentConvId(newConvId);
                targetConvId = newConvId; // Update local tracker
                return [newConv, ...prev.filter(c => !c.id.startsWith('temp_'))];
              }
              // Otherwise update the existing one's ID if needed
              if (targetConvId && targetConvId !== newConvId) {
                setCurrentConvId(newConvId);
                const updated = prev.map(c => c.id === targetConvId ? { ...c, id: newConvId } : c);
                targetConvId = newConvId; // Update local tracker
                return updated;
              }
              return prev;
            });
          }

          if (data) {
            setConversations((prev) => prev.map((conv) => {
              if (conv.id === targetConvId) {
                const updatedMessages = conv.messages.map((msg) => {
                  if (msg.id === assistantMessageId) {
                    const newProgress = [...(msg.progress || [])];
                    if (eventType !== 'draft_chunk' && eventType !== 'session') {
                      newProgress.push({ type: eventType as any, payload: data });
                    }

                    let newContent = msg.content;
                    if (eventType === 'token') {
                      // Stream tokens from LLM
                      accumulatedContent += data.content || "";
                      newContent = accumulatedContent;
                    } else if (eventType === 'draft_chunk') {
                      accumulatedContent += data.content || "";
                      newContent = accumulatedContent;
                    } else if (eventType === 'message_end') {
                      newContent = data.content;
                      return { ...msg, content: newContent, status: 'completed' as const, report: data.report, progress: newProgress };
                    }

                    return { ...msg, content: newContent, progress: newProgress };
                  }
                  return msg;
                });
                return { ...conv, messages: updatedMessages, lastUpdate: Date.now() };
              }
              return conv;
            }));
          }
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      setConversations((prev) => prev.map((conv) => 
        conv.id === targetConvId 
          ? { 
              ...conv, 
              messages: conv.messages.map(msg =>
                msg.id === assistantMessageId 
                  ? { ...msg, status: 'error', content: "Analysis failed. Please check the backend connection." } 
                  : msg
              )
            }
          : conv
      ));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `temp_${Date.now()}`,
      title: `New Chat`,
      messages: [],
      lastUpdate: Date.now()
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConvId(newConv.id);
  };

  const handleSwitchConversation = (convId: string) => {
    setCurrentConvId(convId);
  };

  const handleDeleteConversation = (convId: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== convId);
      if (currentConvId === convId && filtered.length > 0) {
        setCurrentConvId(filtered[0].id);
      } else if (filtered.length === 0) {
        setCurrentConvId(null);
      }
      return filtered;
    });
  };

  return (
    <main className="flex h-screen bg-[#050505] text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(112,0,255,0.05),_transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none brightness-100" />
      
      {/* Sidebar - Conversation List */}
      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col z-50">
        <div className="p-4 border-b border-white/5">
          <button
            onClick={handleNewConversation}
            className="w-full px-4 py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/20 rounded-lg text-[#00ffcc] text-sm font-mono tracking-wider transition-all"
          >
            + NEW CHAT
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => handleSwitchConversation(conv.id)}
              className={cn(
                "p-3 mb-2 rounded-lg cursor-pointer transition-all group",
                currentConvId === conv.id
                  ? "bg-[#00ffcc]/10 border border-[#00ffcc]/20"
                  : "bg-white/[0.02] hover:bg-white/[0.05] border border-transparent"
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono truncate flex-1">
                  {conv.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 text-xs ml-2"
                >
                  ×
                </button>
              </div>
              <div className="text-[9px] text-white/30 mt-1">
                {conv.messages.length} messages
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-black/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#00ffcc] rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(0,255,204,0.3)] group transition-all duration-500 hover:scale-110">
            <Zap className="text-black" size={28} fill="currentColor" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">TXray</h1>
            <p className="text-[10px] text-[#00ffcc] font-mono tracking-[0.3em] uppercase opacity-70 mt-1">MEV Intelligence Agent</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/30 uppercase">
          <div className="flex items-center gap-2 border-r border-white/10 pr-8">
            <div className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
            <span>Node: Ethereum Mainnet</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#00ffcc]" />
            <span>Encrypted Session</span>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-10 scanline relative scroll-smooth" ref={scrollRef}>
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-12"
            >
              <div className="relative group">
                <div className="absolute -inset-12 bg-[#00ffcc]/10 blur-[100px] rounded-full group-hover:bg-[#00ffcc]/20 transition-all duration-700" />
                <div className="w-24 h-24 rounded-3xl border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-2xl relative">
                  <Terminal size={48} className="text-[#00ffcc]" />
                </div>
              </div>
              
              <div className="space-y-6">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase">Ready for <span className="text-[#00ffcc]">Scan</span></h2>
                <p className="text-white/40 text-lg md:text-xl font-light leading-relaxed max-w-xl mx-auto">
                  Submit an Ethereum transaction hash for deep forensic MEV analysis. 
                  Real-time RPC tracing and AI-powered pattern recognition.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full pt-8">
                {[
                  { hash: '0x5c1...', type: 'Sandwich Attack' },
                  { hash: '0x2b4...', type: 'Arbitrage Loop' }
                ].map((ex) => (
                  <button 
                    key={ex.hash}
                    onClick={() => handleSend(ex.hash)}
                    className="p-6 glass-panel rounded-2xl text-left hover:bg-white/5 transition-all duration-300 border-l-4 border-[#00ffcc] group"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] text-[#00ffcc] uppercase font-bold tracking-widest">{ex.type}</p>
                      <ChevronRight size={14} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="text-sm font-mono text-white/60 truncate">{ex.hash}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-8">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col w-full",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[90%] md:max-w-[80%] p-8 rounded-3xl relative transition-all duration-500",
                    msg.role === 'user' 
                      ? "bg-[#7000ff]/10 border border-[#7000ff]/20 text-white rounded-tr-none shadow-[0_0_40px_rgba(112,0,255,0.1)]" 
                      : "glass-panel rounded-tl-none shadow-2xl"
                  )}>
                    <div className="flex items-center gap-3 mb-6">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
                        msg.role === 'user' ? "bg-[#7000ff] text-white" : "bg-[#00ffcc] text-black"
                      )}>
                        {msg.role === 'user' ? 'OP' : 'AI'}
                      </div>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                        {msg.role === 'user' ? 'Operator Command' : 'Agent Response'}
                      </span>
                    </div>
                    
                    {msg.role === 'assistant' && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-8"
                      >
                        <WorkflowVisualizer 
                          events={msg.progress || []} 
                          defaultExpanded={msg.status === 'loading'} 
                        />
                      </motion.div>
                    )}

                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus as any}
                                language={match[1]}
                                PreTag="div"
                                className="!rounded-2xl !bg-black/60 !border !border-white/5 !p-6 !my-6"
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-[#00ffcc]/10 text-[#00ffcc] px-2 py-0.5 rounded-md text-sm" {...props}>
                                {children}
                              </code>
                            );
                          },
                          p: ({ children }) => <p className="text-white/80 leading-relaxed mb-4 text-lg">{children}</p>,
                          h1: ({ children }) => <h1 className="text-2xl font-black text-[#00ffcc] uppercase tracking-tighter mb-6 mt-8">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4 mt-6">{children}</h2>,
                          li: ({ children }) => <li className="text-white/70 mb-2 text-lg">{children}</li>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {msg.report && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-10 pt-10 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-[#00ffcc]/30 transition-colors group">
                          <p className="text-[10px] text-[#00ffcc] uppercase font-bold tracking-[0.2em] mb-2">Pattern Detection</p>
                          <p className="text-3xl font-black uppercase italic tracking-tighter group-hover:scale-105 transition-transform origin-left">{msg.report.mevType}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-[#ff007a]/30 transition-colors group">
                          <p className="text-[10px] text-[#ff007a] uppercase font-bold tracking-[0.2em] mb-2">Resource Cost</p>
                          <p className="text-3xl font-black uppercase italic tracking-tighter group-hover:scale-105 transition-transform origin-left">{msg.report.technicalDetails.gasUsed} <span className="text-sm font-light text-white/30 not-italic">GAS</span></p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Terminal */}
      <div className="p-6 md:p-10 bg-black/60 backdrop-blur-3xl border-t border-white/5 z-[100]">
        <div className="max-w-5xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-[#00ffcc] to-[#7000ff] rounded-[2rem] opacity-20 blur group-focus-within:opacity-40 transition-opacity" />
          <div className="relative flex items-center bg-[#0a0a0a] rounded-[1.8rem] overflow-hidden border border-white/10 group-focus-within:border-white/20 transition-all">
            <div className="pl-8 text-white/20">
              <Terminal size={24} />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="ENTER TRANSACTION HASH (0x...)"
              className="flex-1 bg-transparent py-8 px-6 focus:outline-none font-mono text-xl tracking-tight placeholder:text-white/10 uppercase"
            />
            <div className="pr-4">
              <button
                onClick={() => handleSend()}
                disabled={isAnalyzing || !input.trim()}
                className="bg-[#00ffcc] text-black h-16 px-10 rounded-2xl font-black uppercase tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale flex items-center gap-3 shadow-[0_0_30px_rgba(0,255,204,0.2)]"
              >
                {isAnalyzing ? (
                  <div className="w-6 h-6 border-3 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Execute</span>
                    <Send size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto flex justify-between items-center mt-6 text-[9px] font-mono tracking-[0.4em] text-white/10 uppercase">
          <span>TXray Neural Core // Build 2026.0.1</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-[#00ffcc]" /> RPC OK</span>
            <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-[#00ffcc]" /> AI OK</span>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
