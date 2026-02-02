"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Shield, Terminal, Globe, ChevronRight, Cpu, Search, Activity, Database, Star } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { WorkflowVisualizer } from "@/components/WorkflowVisualizer";
import { Message, ProgressEvent } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { X402Client } from "@coinbase/x402";

/** Normalize block math: [ \... ] and \[ ... \] -> $$ ... $$ so remark-math can parse */
function normalizeBlockMath(content: string): string {
  if (!content || typeof content !== "string") return content;
  // [ \text{...} ] or [ \frac{...} ] etc. (capture includes leading backslash)
  let out = content.replace(/^\[\s*(\\.*?)\s*\]\s*$/gm, "$$ $1 $$");
  // \[ ... \] (standard LaTeX display math)
  out = out.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, "$$ $1 $$");
  return out;
}

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
  const [paymentRequired, setPaymentRequired] = useState<{
    amount: string;
    recipient: string;
    reference: string;
    paywallUrl: string;
    retryData?: { text?: string };
  } | null>(null);
  const [adminToken, setAdminToken] = useState<string>("");
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ messageId: string } | null>(null);
  const [reputation, setReputation] = useState<{ count: number; average: number } | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations and admin token from localStorage on mount
  useEffect(() => {
    const savedConvs = localStorage.getItem('txray_conversations');
    if (savedConvs) {
      try {
        const parsed = JSON.parse(savedConvs);
        setConversations(parsed);
        if (parsed.length > 0) {
          setCurrentConvId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to load conversations', e);
      }
    }

    const savedToken = localStorage.getItem('txray_admin_token');
    if (savedToken) {
      setAdminToken(savedToken);
    }

    // Load reputation data
    fetchReputation();
  }, []);

  // Check wallet connection on mount
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ethereum) return;
    (window as any).ethereum
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts.length > 0) setWalletAddress(accounts[0]);
      })
      .catch(() => {});
  }, []);

  const connectWallet = async () => {
    try {
      if (!(window as any).ethereum) {
        toast.error("No wallet found", { description: "Install MetaMask or another Web3 wallet." });
        return;
      }
      const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      setWalletAddress(accounts[0]);
      toast.success("Wallet connected");
    } catch (e: any) {
      toast.error("Connection failed", { description: e.message });
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    toast.success("Wallet disconnected");
  };

  // Fetch ERC-8004 reputation
  const fetchReputation = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/api/erc8004/reputation`);
      if (res.ok) {
        const { count, summaryValue } = await res.json();
        const n = Number(count);
        const avg = n > 0 ? Math.round(Number(summaryValue) / n) : 0;
        setReputation({ count: n, average: avg });
      }
    } catch (e) {
      console.error('Failed to fetch reputation', e);
    }
  };

  // Save admin token to localStorage
  useEffect(() => {
    if (adminToken) {
      localStorage.setItem('txray_admin_token', adminToken);
    } else {
      localStorage.removeItem('txray_admin_token');
    }
  }, [adminToken]);

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

  const handleSend = async (text?: string, paymentPayload?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isAnalyzing) return;

    // Use a local variable to store the target conversation ID
    let targetConvId = currentConvId;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };

    // Only add user message if this isn't a retry with payment
    if (!paymentPayload) {
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
    }

    setInput("");
    setIsAnalyzing(true);
    setPaymentRequired(null);

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

      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };

      if (adminToken) {
        headers["X-Admin-Token"] = adminToken;
        headers["Authorization"] = `Bearer ${adminToken}`;
      }

      if (paymentPayload) {
        headers["X-PAYMENT"] = paymentPayload;
      }

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: messageText,
          conversationId: targetConvId && !targetConvId.startsWith('temp_') ? targetConvId : undefined
        }),
      });

      if (response.status === 402) {
        const data = await response.json();

        // Handle x402 standard response structure
        if (data.accepts && data.accepts.length > 0) {
          const payment = data.accepts[0];
          // Convert maxAmountRequired (in atomic units) to human readable USDC (6 decimals)
          const amount = (parseInt(payment.maxAmountRequired) / 1_000_000).toString();

          // Use x402.sh as the payment gateway
          const paywallUrl = `https://x402.sh/pay/${payment.payTo}?amount=${amount}&network=${payment.network}&asset=${payment.asset}&reference=${encodeURIComponent(payment.resource)}`;

          setPaymentRequired({
            amount: amount,
            recipient: payment.payTo,
            reference: payment.resource,
            paywallUrl: paywallUrl,
            retryData: { text: messageText }
          });
        } else {
          // Fallback for non-standard or direct response
          setPaymentRequired({
            ...data,
            retryData: { text: messageText }
          });
        }

        // Remove the loading assistant message since we need payment
        setConversations(prev => prev.map(c =>
          c.id === targetConvId
            ? { ...c, messages: c.messages.filter(m => m.id !== assistantMessageId) }
            : c
        ));
        setIsAnalyzing(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

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
    } catch (error: any) {
      console.error("Analysis failed:", error);
      toast.error("Analysis failed", {
        description: error.message || "Please check the backend connection."
      });
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

  const handleSubmitFeedback = async (rating: number) => {
    if (!feedbackModal) return;

    try {
      if (!(window as any).ethereum) {
        toast.error("Web3 Wallet Required", {
          description: "Please install MetaMask to submit feedback."
        });
        return;
      }

      const ethereum = (window as any).ethereum;
      toast.loading("Connecting wallet...", { id: "feedback" });

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      // Ensure on Ethereum Mainnet (chainId 1)
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x1' }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          toast.error("Ethereum Mainnet Required", {
            description: "Please add Ethereum Mainnet to your wallet.",
            id: "feedback"
          });
          return;
        }
      }

      toast.loading("Getting transaction parameters...", { id: "feedback" });

      // Get tx params from backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const agentId = process.env.NEXT_PUBLIC_ERC8004_AGENT_ID || "22715";
      const res = await fetch(`${backendUrl}/api/erc8004/feedback-tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-ERC8004-Agent-Id': agentId
        },
        body: JSON.stringify({
          agentId: agentId,
          value: rating * 20, // Convert 1-5 stars to 20-100 scale
          tag1: 'starred',
          tag2: ''
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const message = errBody.error || errBody.message || `Server error: ${res.status}`;
        throw new Error(message);
      }

      const { to, data, value: rawValue } = await res.json();

      // Ensure value is hex (backend may return "0" or 0)
      let valueHex = "0x0";
      if (rawValue != null && rawValue !== "" && rawValue !== "0") {
        if (typeof rawValue === "string" && rawValue.startsWith("0x")) {
          valueHex = rawValue;
        } else {
          const n = BigInt(rawValue);
          valueHex = "0x" + n.toString(16);
        }
      }

      toast.loading("Please confirm transaction in wallet...", { id: "feedback" });

      // Send transaction
      const txHash = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: userAddress,
          to: to,
          data: data,
          value: valueHex
        }],
      });

      toast.success("Feedback submitted!", {
        description: `Transaction: ${txHash.slice(0, 10)}...`,
        id: "feedback"
      });

      setFeedbackModal(null);
      
      // Refresh reputation after a delay
      setTimeout(() => fetchReputation(), 3000);

    } catch (error: any) {
      console.error("Feedback submission failed:", error);
      const msg = error.message || "User rejected transaction";
      const isReject = error.code === 4001 || msg.toLowerCase().includes("reject");
      toast.error("Feedback Failed", {
        description: isReject
          ? "Transaction was rejected."
          : msg + (msg.includes("revert") || msg.includes("execution") ? " — Make sure you're on Ethereum Mainnet and you're not the agent owner (only others can submit feedback)." : ""),
        id: "feedback"
      });
    }
  };

  const handlePayment = async () => {
    if (!paymentRequired) return;
    
    try {
      if (!(window as any).ethereum) {
        toast.error("Web3 Wallet Required", {
          description: "Please install MetaMask or another Web3 wallet."
        });
        return;
      }

      const ethereum = (window as any).ethereum;
      toast.loading("Connecting wallet...", { id: "x402_pay" });

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const userAddress = accounts[0];

      // Ensure on Base network
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch (err: any) {
        if (err.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org']
            }]
          });
        }
      }

      toast.loading("Please sign the payment authorization...", { id: "x402_pay" });

      // EIP-3009 transferWithAuthorization parameters
      const domain = {
        name: 'USD Coin',
        version: '2',
        chainId: 8453, // Base
        verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' // USDC on Base
      };

      // Generate a unique nonce for this authorization
      const nonceBytes = new Uint8Array(32);
      crypto.getRandomValues(nonceBytes);
      const nonce = '0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // Valid for 1 hour

      const message = {
        from: userAddress,
        to: paymentRequired.recipient,
        value: Math.floor(parseFloat(paymentRequired.amount) * 1_000_000).toString(), // Convert to atomic units
        validAfter: validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce: nonce
      };

      const types = {
        EIP712Domain: [
          { name: 'name', type: 'string' },
          { name: 'version', type: 'string' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' }
        ]
      };

      const typedData = {
        types,
        domain,
        primaryType: 'TransferWithAuthorization',
        message
      };

      // Request signature from user (NO GAS!)
      const signature = await ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [userAddress, JSON.stringify(typedData)],
      });

      toast.success("Signature collected!", { id: "x402_pay" });

      // Construct x402-compliant payment payload
      const x402Payload = {
        x402Version: 1,
        scheme: "exact",
        network: "base",
        payload: {
          signature: signature,
          authorization: {
            from: userAddress,
            to: paymentRequired.recipient,
            value: message.value, // Already a string
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce: nonce
          }
        }
      };

      // Convert to Base64-encoded JSON string for X-PAYMENT header
      const paymentPayload = btoa(JSON.stringify(x402Payload));

      // Send directly to backend with X-PAYMENT header
      // Backend will verify with facilitator or validate the signature itself
      handleSend(paymentRequired.retryData?.text, paymentPayload);
      setPaymentRequired(null);

    } catch (error: any) {
      console.error("x402 payment failed:", error);
      toast.error("Payment Authorization Failed", {
        description: error.message || "User rejected the signature request.",
        id: "x402_pay"
      });
    }
  };

  return (
    <main className="flex h-screen bg-[#050505] text-white overflow-hidden relative">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(112,0,255,0.05),_transparent)] pointer-events-none" />
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none brightness-100" />

      {/* Payment Modal */}
      <AnimatePresence>
        {paymentRequired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00ffcc]/10 blur-[80px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#7000ff]/10 blur-[80px] rounded-full" />

              <div className="relative z-10 text-center space-y-6">
                <div className="w-20 h-20 bg-[#00ffcc]/10 rounded-3xl flex items-center justify-center mx-auto border border-[#00ffcc]/20">
                  <Database className="text-[#00ffcc]" size={40} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Payment Required</h3>
                  <p className="text-white/40 text-sm font-mono uppercase tracking-widest">To access deep forensic analysis</p>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Amount</span>
                    <span className="text-xl font-black text-[#00ffcc]">{paymentRequired.amount} <span className="text-xs font-light text-white/40">USDC</span></span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/40 uppercase font-bold tracking-widest">Network</span>
                    <span className="text-xs font-mono text-white/60">Base Mainnet</span>
                  </div>
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-2">Recipient Address</p>
                    <div className="flex items-center gap-2 bg-black/40 p-3 rounded-xl border border-white/5">
                      <code className="text-[10px] font-mono text-white/60 truncate flex-1">{paymentRequired.recipient}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentRequired.recipient);
                          toast.success("Address copied");
                        }}
                        className="text-[#00ffcc] hover:text-white transition-colors"
                      >
                        <Activity size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={handlePayment}
                    className="w-full bg-[#00ffcc] text-black py-5 rounded-2xl font-black uppercase tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,255,204,0.2)]"
                  >
                    Pay with x402
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const payload = prompt("If you've paid, enter the payment payload (JSON) here:");
                        if (payload) {
                          try {
                            // Validate if it's JSON or just use as is
                            handleSend(paymentRequired.retryData?.text, payload);
                            setPaymentRequired(null);
                          } catch (e) {
                            toast.error("Invalid payload format");
                          }
                        }
                      }}
                      className="flex-1 bg-white/5 text-white/60 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5"
                    >
                      Manual Verify
                    </button>
                    <button
                      onClick={() => setPaymentRequired(null)}
                      className="flex-1 bg-white/5 text-white/40 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all border border-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <p className="text-[9px] text-white/20 font-mono uppercase tracking-[0.2em]">
                  Powered by Coinbase x402 Protocol
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Token Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="relative z-10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#7000ff]/10 rounded-xl flex items-center justify-center border border-[#7000ff]/20">
                    <Shield className="text-[#7000ff]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter">Admin Access</h3>
                    <p className="text-white/40 text-[10px] font-mono uppercase tracking-widest">Bypass payment protocol</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest ml-1">Admin Token</label>
                    <input
                      type="password"
                      value={adminToken}
                      onChange={(e) => setAdminToken(e.target.value)}
                      placeholder="ENTER ACCESS TOKEN"
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 focus:outline-none focus:border-[#7000ff]/50 font-mono text-sm transition-all"
                    />
                  </div>
                  <p className="text-[10px] text-white/20 leading-relaxed italic">
                    Token is stored locally in your browser and never shared with anyone except the API server.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={() => setIsAdminModalOpen(false)}
                    className="w-full bg-[#7000ff] text-white py-4 rounded-xl font-black uppercase tracking-tighter hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Save & Close
                  </button>
                  <button
                    onClick={() => {
                      setAdminToken("");
                      setIsAdminModalOpen(false);
                    }}
                    className="w-full text-white/40 py-2 text-[10px] font-bold uppercase tracking-widest hover:text-red-400 transition-all"
                  >
                    Clear Token
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Rating Modal */}
      <AnimatePresence>
        {feedbackModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#ffcc00]/10 blur-[80px] rounded-full" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#ff9900]/10 blur-[80px] rounded-full" />

              <div className="relative z-10 text-center space-y-6">
                <div className="w-20 h-20 bg-[#ffcc00]/10 rounded-3xl flex items-center justify-center mx-auto border border-[#ffcc00]/20">
                  <Star className="text-[#ffcc00]" size={40} fill="currentColor" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Rate Analysis</h3>
                  <p className="text-white/40 text-sm font-mono uppercase tracking-widest">Your feedback improves our AI</p>
                </div>

                <div className="flex justify-center gap-3 py-4">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <motion.button
                      key={stars}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSubmitFeedback(stars)}
                      className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 hover:border-[#ffcc00]/50 hover:bg-[#ffcc00]/10 transition-all flex items-center justify-center group"
                    >
                      <Star size={24} className="text-white/30 group-hover:text-[#ffcc00] group-hover:fill-[#ffcc00] transition-colors" fill="none" />
                    </motion.button>
                  ))}
                </div>

                <div className="text-[10px] text-white/40 space-y-1">
                  <p>1★ = Poor | 3★ = Average | 5★ = Excellent</p>
                  <p className="text-white/20">Requires Ethereum Mainnet • Gas fee paid in ETH</p>
                </div>

                <button
                  onClick={() => setFeedbackModal(null)}
                  className="w-full text-white/40 py-2 text-[10px] font-bold uppercase tracking-widest hover:text-white/60 transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col z-50">
        <div className="p-4 border-b border-white/5 space-y-2">
          <button
            onClick={handleNewConversation}
            className="w-full px-4 py-2 bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/20 rounded-lg text-[#00ffcc] text-sm font-mono tracking-wider transition-all"
          >
            + NEW CHAT
          </button>
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className={cn(
              "w-full px-4 py-2 border rounded-lg text-xs font-mono tracking-wider transition-all flex items-center justify-center gap-2",
              adminToken
                ? "bg-[#7000ff]/10 border-[#7000ff]/30 text-[#7000ff] hover:bg-[#7000ff]/20"
                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
            )}
          >
            <Shield size={12} />
            {adminToken ? "ADMIN ACTIVE" : "ADMIN ACCESS"}
          </button>
          <button
            onClick={() => setFeedbackModal({ messageId: "test" })}
            className="w-full px-4 py-2 border border-[#ffcc00]/20 rounded-lg text-[#ffcc00]/80 text-xs font-mono tracking-wider transition-all flex items-center justify-center gap-2 hover:bg-[#ffcc00]/10"
          >
            <Star size={12} />
            Test Rating
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

          <div className="flex items-center gap-4 flex-wrap">
            <div className="hidden md:flex items-center gap-8 text-[10px] font-mono tracking-widest text-white/30 uppercase">
            {reputation && reputation.count > 0 && (
              <div className="flex items-center gap-2 border-r border-white/10 pr-8">
                <Star size={14} className="text-[#ffcc00] fill-[#ffcc00]" />
                <span>{(reputation.average / 20).toFixed(1)} / 5 ({reputation.count} reviews)</span>
              </div>
            )}
            <div className="flex items-center gap-2 border-r border-white/10 pr-8">
              <div className="w-2 h-2 rounded-full bg-[#00ffcc] animate-pulse" />
              <span>Node: Ethereum Mainnet</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-[#00ffcc]" />
              <span>Encrypted Session</span>
            </div>
          </div>
            <div className="flex items-center gap-2 ml-auto">
              {walletAddress ? (
                <div className="flex items-center gap-1.5 border border-white/10 rounded-lg pl-2 pr-1 py-1 bg-white/5">
                  <span className="text-white/70 truncate max-w-[100px] md:max-w-[120px] text-[9px] md:text-[10px]">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      toast.success("Address copied");
                    }}
                    className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    title="Copy"
                  >
                    <Activity size={12} />
                  </button>
                  <button
                    onClick={disconnectWallet}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-[9px] font-bold uppercase transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 rounded-xl bg-[#00ffcc]/10 hover:bg-[#00ffcc]/20 border border-[#00ffcc]/30 text-[#00ffcc] text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Connect Wallet
                </button>
              )}
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
                        {msg.status === 'loading' ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 min-h-[4rem]">
                            <pre className="whitespace-pre-wrap break-words font-mono text-sm text-white/85 leading-relaxed m-0 p-0 bg-transparent border-0 text-left">
                              {msg.content || ''}<span className="inline-block w-2 h-4 ml-0.5 bg-[#00ffcc] animate-pulse align-middle" aria-hidden />
                            </pre>
                          </div>
                        ) : (
                        <motion.div
                          initial={{ opacity: 0.6 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                        <ReactMarkdown
                          remarkPlugins={[remarkMath, remarkGfm]}
                          rehypePlugins={[rehypeKatex]}
                          components={{
                            code({ node, inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || "");
                              const raw = String(children);
                              const isHex = /^0x[a-fA-F0-9]+$/.test(raw.trim());
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  className="!rounded-2xl !bg-black/60 !border !border-white/5 !p-6 !my-6"
                                  {...props}
                                >
                                  {raw.replace(/\n$/, "")}
                                </SyntaxHighlighter>
                              ) : (
                                <code
                                  className={cn(
                                    "px-2 py-0.5 rounded-md text-sm font-mono",
                                    isHex ? "bg-[#00ffcc]/20 text-[#00ffcc] border border-[#00ffcc]/30" : "bg-[#00ffcc]/10 text-[#00ffcc]"
                                  )}
                                  {...props}
                                >
                                  {children}
                                </code>
                              );
                            },
                            p: ({ children }) => <p className="text-white/80 leading-relaxed mb-4 text-lg">{children}</p>,
                            h1: ({ children }) => <h1 className="text-2xl font-black text-[#00ffcc] uppercase tracking-tighter mb-6 mt-8">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-black text-white uppercase tracking-tighter mb-4 mt-6">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-black text-white/90 uppercase tracking-tighter mb-3 mt-4">{children}</h3>,
                            li: ({ children }) => <li className="text-white/70 mb-2 text-lg">{children}</li>,
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-6 rounded-2xl border border-white/10 bg-black/40">
                                <table className="w-full border-collapse text-left">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => (
                              <thead className="bg-white/5 border-b border-white/10">{children}</thead>
                            ),
                            tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
                            tr: ({ children }) => (
                              <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>
                            ),
                            th: ({ children }) => (
                              <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-white/50 whitespace-nowrap">
                                {children}
                              </th>
                            ),
                            td: ({ children }) => (
                              <td className="px-5 py-4 text-sm text-white/80 font-mono">
                                {children}
                              </td>
                            ),
                          }}
                        >
                          {normalizeBlockMath(msg.content)}
                        </ReactMarkdown>
                        </motion.div>
                        )}
                      </div>

                      {msg.report && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-10 pt-10 border-t border-white/5 space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-[#00ffcc]/30 transition-colors group">
                              <p className="text-[10px] text-[#00ffcc] uppercase font-bold tracking-[0.2em] mb-2">Pattern Detection</p>
                              <p className="text-3xl font-black uppercase italic tracking-tighter group-hover:scale-105 transition-transform origin-left">{msg.report.mevType}</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-[#ff007a]/30 transition-colors group">
                              <p className="text-[10px] text-[#ff007a] uppercase font-bold tracking-[0.2em] mb-2">Resource Cost</p>
                              <p className="text-3xl font-black uppercase italic tracking-tighter group-hover:scale-105 transition-transform origin-left">{msg.report.technicalDetails.gasUsed} <span className="text-sm font-light text-white/30 not-italic">GAS</span></p>
                            </div>
                          </div>

                          {msg.status === 'completed' && msg.role === 'assistant' && (
                            <div className="pt-6 border-t border-white/5">
                              <button
                                onClick={() => setFeedbackModal({ messageId: msg.id })}
                                className="w-full px-6 py-4 bg-[#ffcc00]/10 hover:bg-[#ffcc00]/20 border border-[#ffcc00]/20 rounded-xl text-[#ffcc00] text-sm font-mono tracking-wider transition-all flex items-center justify-center gap-2"
                              >
                                <Star size={16} />
                                Rate This Analysis
                              </button>
                            </div>
                          )}
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
