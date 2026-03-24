import { motion, AnimatePresence } from "motion/react";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAgentStore } from "../../lib/agentStore";
import { useChat } from "../../hooks/useQueries";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ExplorerChatProps {
  onClose: () => void;
}

export default function ExplorerChat({ onClose }: ExplorerChatProps) {
  const { userFullName, userGoal } = useAgentStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  
  const chatMutation = useChat();

  // Auto greeting on first open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: "Hey! What do you want to explore today? Need news, ideas, or something interesting?"
        }
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMsg = input.trim();
    setInput("");
    
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: Date.now().toString(), role: "user", content: userMsg }
    ];
    setMessages(newMessages);

    try {
      // We pass the userGoal as context and request a friendly persona
      const response = await chatMutation.mutateAsync({
        prompt: userMsg,
        type: "explorer",
        context: { info: `User goal: ${userGoal}. Act as an Explorer AI: friendly, engaging, conversational, and slightly fun assistant. Answer questions, give tips, tell stories. NOT a strict mentor.` }
      });

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: response.message }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Oops! My circuits got crossed. Let's try that again?" }
      ]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="fixed inset-4 md:inset-auto md:bottom-24 md:right-6 md:w-[400px] md:h-[600px] z-[100] glass-card-strong rounded-2xl flex flex-col shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-border/40 flex items-center justify-between premium-gradient-bg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-white text-lg leading-tight">Explorer AI</h2>
            <p className="text-white/70 text-xs font-medium">Friendly Assistant</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted/80 text-foreground border border-border/50 rounded-tl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {chatMutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-muted/80 text-foreground border border-border/50 p-3.5 rounded-2xl rounded-tl-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm font-medium opacity-70">Exploring...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/40">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything, explore ideas..."
            className="flex-1 premium-input text-sm rounded-full px-4"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatMutation.isPending}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-transform disabled:opacity-50 hover:scale-105 active:scale-95 shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </motion.div>
  );
}
