import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Sparkles, Pencil, Check, X, Loader2, Send, Flame, SmilePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  useChat, 
  useAssistantMessages, 
  useDeleteAssistantMessages,
  useGetCallerUserProfile,
  useGetTasks,
  useGetReminders
} from "../../hooks/useQueries";
import { toast } from "sonner";
import { useAgentStore } from "../../lib/agentStore";

interface AssistantPanelProps {
  userId: string;
}

const QUICK_ACTIONS = [
  { label: "Plan My Day", prompt: "Help me plan my day effectively. What should I focus on first?", emoji: "📅" },
  { label: "Add Task", prompt: "I want to add a new task. Can you help me structure it?", emoji: "✅" },
  { label: "Ask Doubt", prompt: "I have a question I need help with.", emoji: "🤔" },
  { label: "Motivate Me", prompt: "I need some motivation right now. Give me a powerful push to get started!", emoji: "🔥" },
];

const MODE_OPTIONS = [
  { value: "friendly", label: "Friendly", emoji: "😊" },
  { value: "kohli", label: "Strict", emoji: "🔥" },
];

export default function AssistantPanel({ userId }: AssistantPanelProps) {
  const { data: messages = [], isLoading: loadingMessages } = useAssistantMessages();
  const { mutateAsync: sendMessage, isPending: isSending } = useChat();
  const { mutateAsync: deleteMessages } = useDeleteAssistantMessages();
  
  const { data: profile } = useGetCallerUserProfile();
  const { data: tasks = [] } = useGetTasks();
  const { data: reminders = [] } = useGetReminders();

  const { agentName, personality, setFullContext } = useAgentStore();
  const [input, setInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(agentName || "AI Assistant");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const showGreeting = !loadingMessages && messages.length === 0;

  const handleSend = async (promptOverride?: string) => {
    const prompt = (promptOverride || input).trim();
    if (!prompt || isSending) return;
    setInput("");

    try {
      const context = {
        username: profile?.username,
        tasks: tasks.map(t => ({ title: t.title, isComplete: t.isComplete })),
        reminders: reminders.map(r => ({ title: r.title }))
      };
      await sendMessage({ 
        prompt, 
        type: "explorer", 
        context,
        conversationHistory: messages.map((m: any) => ({ role: m.role, text: m.text }))
      });
    } catch {
      toast.error("Failed to reach explorer assistant");
    }
  };

  const handleClear = async () => {
    if (window.confirm("Clear your conversation history?")) {
      await deleteMessages();
    }
  };

  const saveName = () => {
    if (tempName.trim()) {
      setFullContext({ agentName: tempName.trim() });
      toast.success("Agent name updated!");
    }
    setEditingName(false);
  };

  const currentMode = MODE_OPTIONS.find(m => m.value === personality) || MODE_OPTIONS[0];
  const otherMode = MODE_OPTIONS.find(m => m.value !== personality) || MODE_OPTIONS[1];
  
  // Generate an avatar color/initial from agent name
  const avatarInitial = (agentName || "AI").charAt(0).toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-4 p-2">

      {/* ── AI Profile Block ── */}
      <div className="glass-card-strong p-5 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-4">
          
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl premium-gradient-bg flex items-center justify-center shadow-lg border-2 border-white/10 glow-primary">
              <span className="text-white text-xl font-black">{avatarInitial}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
          </div>

          {/* Name + mode */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  className="flex-1 bg-black/20 border border-primary/30 rounded-lg px-3 py-1 text-sm text-foreground focus:outline-none focus:border-primary/60 font-bold"
                />
                <button onClick={saveName} className="p-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-foreground tracking-tight truncate">{agentName || "AI Assistant"}</h2>
                <button onClick={() => { setTempName(agentName || "AI Assistant"); setEditingName(true); }} className="p-1 text-muted-foreground hover:text-primary transition-colors rounded">
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">Friendly Productivity Companion · Always Online</p>
            
            {/* Mode toggle */}
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mode:</span>
              <button
                onClick={() => setFullContext({ personality: personality === "friendly" ? "kohli" : "friendly" } as any)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-all ${
                  personality === "kohli" 
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" 
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {currentMode.emoji} {currentMode.label}
              </button>
              <span className="text-[10px] text-muted-foreground/40">→ click to switch to {otherMode.label}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClear} title="Clear history">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="glass-card-strong border-border/30 overflow-hidden flex flex-col">
        <ScrollArea className="h-[420px] p-4">
          <div className="space-y-3 pr-1">
            
            <AnimatePresence>
              {showGreeting && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-6 py-8 px-4"
                >
                  {/* Greeting bubble */}
                  <div className="flex justify-start w-full">
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-full premium-gradient-bg flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-black">{avatarInitial}</span>
                      </div>
                      <div className="max-w-[78%] bg-secondary/50 border border-secondary/60 text-foreground rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm">
                        <p className="text-sm font-medium leading-relaxed">Hey 👋 What do you want to focus on today?</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="w-full grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(action => (
                      <motion.button
                        key={action.label}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleSend(action.prompt)}
                        disabled={isSending}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/50 bg-background/60 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group disabled:opacity-50"
                      >
                        <span className="text-lg">{action.emoji}</span>
                        <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.map((msg: any) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full premium-gradient-bg flex items-center justify-center shrink-0 mr-1.5 mt-0.5">
                    <span className="text-white text-[9px] font-black">{avatarInitial}</span>
                  </div>
                )}
                <div
                  className={`max-w-[72%] rounded-2xl px-3 py-2 shadow-sm ${
                    msg.role === "assistant"
                      ? "bg-secondary/50 border border-secondary/60 text-foreground rounded-bl-sm"
                      : "bg-primary text-primary-foreground rounded-br-sm shadow-primary/20"
                  }`}
                >
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[9px] opacity-40 mt-1 block text-right font-medium">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start items-end gap-1.5">
                <div className="w-6 h-6 rounded-full premium-gradient-bg flex items-center justify-center shrink-0">
                  <span className="text-white text-[9px] font-black">{avatarInitial}</span>
                </div>
                <div className="bg-secondary/50 border border-secondary/60 text-foreground rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-2" />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 bg-muted/10 border-t border-border/30 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="flex-1 h-10 rounded-xl bg-background/80 border-border/40 text-foreground text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !isSending) handleSend(); }}
          />
          <Button
            className="h-10 px-4 rounded-xl transition-all active:scale-95"
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
