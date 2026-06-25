"use client"

import { useState } from "react"
import { Bot, Send, Plus, Shield, Search, AlertTriangle, HelpCircle, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"

// Detects whether the user pasted calldata / a domain so we can ground the AI.
function extractContext(text: string): { data?: string; domain?: string } {
  const data = text.match(/0x[0-9a-fA-F]{8,}/)?.[0]
  const domain = text.match(/\b([a-z0-9-]+\.)+[a-z]{2,}\b/i)?.[0]
  return { data, domain }
}

const historyItems = [
  { id: 1, title: "Is this Aave transaction safe?", time: "2 min ago" },
  { id: 2, title: "Check my USDC approvals", time: "1 hr ago" },
  { id: 3, title: "Explain Uniswap V3 approval", time: "Yesterday" },
  { id: 4, title: "Why is my health score low?", time: "2 days ago" },
  { id: 5, title: "Find dangerous approvals", time: "3 days ago" },
]

const promptSuggestions = [
  { icon: Shield, label: "Is this transaction safe?", prompt: "Is this transaction safe?" },
  { icon: Search, label: "Explain this contract", prompt: "Explain this contract" },
  { icon: AlertTriangle, label: "Find dangerous approvals", prompt: "Find dangerous approvals" },
  { icon: HelpCircle, label: "Why am I approving unlimited USDC?", prompt: "Why am I approving unlimited USDC?" },
]

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const initialMessages: Message[] = [
  {
    role: "assistant",
    content: "Hello! I'm your AI Wallet Copilot. I have full context of your wallet history, approvals, and recent transactions. I can help you understand risks, explain contracts, and identify dangerous approvals.\n\nWhat would you like to know about your wallet security?",
    timestamp: "Just now",
  },
]

const BACKEND_META: Record<string, { label: string; color: string }> = {
  bedrock: { label: "AWS Bedrock — Claude", color: "#FF9900" },
  anthropic: { label: "Anthropic Claude", color: "#4F9CF9" },
  fallback: { label: "Local engine (add AWS keys for Bedrock)", color: "#6B7A8D" },
}

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [backend, setBackend] = useState<string>("fallback")

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return
    const userMsg: Message = { role: "user", content: text, timestamp: "Just now" }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const ctx = extractContext(text)
      const { answer, backend: be } = await api.copilot({ message: text, ...ctx })
      setBackend(be)
      setMessages(prev => [...prev, { role: "assistant", content: answer, timestamp: "Just now" }])
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I couldn't reach the Guardian engine just now. Please try again — and if it persists, check that the dev server is running.",
        timestamp: "Just now",
      }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-56px)]">
      {/* Sidebar — conversation history */}
      <div className="w-64 shrink-0 border-r border-white/[0.06] hidden md:flex flex-col bg-[#0D1117]">
        <div className="p-4 border-b border-white/[0.06]">
          <Button
            size="sm"
            className="w-full h-9 bg-[#4F9CF9]/10 hover:bg-[#4F9CF9]/20 text-[#4F9CF9] border border-[#4F9CF9]/20 font-medium text-xs"
            onClick={() => setMessages(initialMessages)}
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> New Conversation
          </Button>
        </div>

        <ScrollArea className="flex-1 px-3 py-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-2">Recent</div>
          <div className="space-y-0.5">
            {historyItems.map((item) => (
              <button
                key={item.id}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group"
                onClick={() => setMessages(initialMessages)}
              >
                <div className="text-xs text-foreground/80 truncate group-hover:text-foreground">{item.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.time}</div>
              </button>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-white/[0.06]">
          {(() => {
            const m = BACKEND_META[backend] ?? BACKEND_META.fallback
            return (
              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: `${m.color}0d`, border: `1px solid ${m.color}26` }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: m.color, boxShadow: `0 0 6px ${m.color}` }} />
                <div>
                  <div className="text-[10px] font-semibold" style={{ color: m.color }}>AI Engine</div>
                  <div className="text-[10px] text-muted-foreground">{m.label}</div>
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "assistant"
                    ? "bg-[#4F9CF9]/15 border border-[#4F9CF9]/25"
                    : "bg-[#22C55E]/15 border border-[#22C55E]/25"
                }`}>
                  {msg.role === "assistant"
                    ? <Bot className="w-4 h-4 text-[#4F9CF9]" />
                    : <span className="text-xs font-bold text-[#22C55E]">DX</span>
                  }
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "assistant"
                      ? "bg-[#111827] border border-white/[0.06] text-foreground"
                      : "bg-[#4F9CF9] text-[#0A0A0A] font-medium"
                  }`}>
                    {msg.content.split("\n").map((line, j) => {
                      const parts = line.split(/(\*\*[^*]+\*\*)/)
                      return (
                        <p key={j} className={j > 0 && line === "" ? "mt-3" : j > 0 ? "mt-1" : ""}>
                          {parts.map((part, k) =>
                            part.startsWith("**") && part.endsWith("**")
                              ? <strong key={k} className={msg.role === "assistant" ? "text-foreground" : "text-[#0A0A0A]"}>{part.slice(2, -2)}</strong>
                              : part
                          )}
                        </p>
                      )
                    })}
                  </div>
                  <span className="text-[10px] text-muted-foreground px-1">{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#4F9CF9]/15 border border-[#4F9CF9]/25 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-[#4F9CF9]" />
                </div>
                <div className="bg-[#111827] border border-white/[0.06] rounded-2xl px-4 py-3 flex items-center gap-1.5">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#4F9CF9]/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested prompts */}
        {messages.length === 1 && (
          <div className="px-6 pb-3">
            <div className="max-w-3xl mx-auto grid grid-cols-2 gap-2">
              {promptSuggestions.map((p) => (
                <button
                  key={p.label}
                  onClick={() => sendMessage(p.prompt)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-[#4F9CF9]/30 hover:bg-[#4F9CF9]/5 transition-all text-left group"
                >
                  <p.icon className="w-4 h-4 text-[#4F9CF9] shrink-0" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="px-6 py-4 border-t border-white/[0.06] bg-[#0D1117]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3 p-1 rounded-2xl bg-[#111827] border border-white/[0.08] focus-within:border-[#4F9CF9]/40 transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
                placeholder="Ask anything about your wallet security..."
                rows={1}
                className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
              />
              <Button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="mb-1 mr-1 w-9 h-9 rounded-xl bg-[#4F9CF9] hover:bg-[#3a87e8] text-[#0A0A0A] disabled:opacity-40 p-0 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">SentinelAI can make mistakes. Always verify critical security decisions independently.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
