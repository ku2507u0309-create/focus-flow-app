import { motion, AnimatePresence } from "motion/react";
import { X, Clock, RefreshCcw, Trash2, Zap, Sparkles, Settings2, Check } from "lucide-react";
import { useAgentStore } from "../../lib/agentStore";
import { useEffect, useState, useRef } from "react";
import { 
  useChat, 
  useAssistantMessages, 
  useSaveAssistantMessage, 
  useDeleteAssistantMessages 
} from "../../hooks/useQueries";
import { toast } from "sonner";
import DailySchedulePanel from "./DailySchedulePanel";

interface MentorModalProps {
  onClose: () => void;
}

export default function MentorModal({ onClose }: MentorModalProps) {
  const { 
    userGoal, deadlineDays, userWeakness, 
    resetMentor, onboardingDone, setFullContext, 
    userFullName, biggestDistraction, agentName
  } = useAgentStore();

  const [activeTab, setActiveTab] = useState<'war-room' | 'chat'>('war-room');
  const [chatInput, setChatInput] = useState("");
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [tempName, setTempName] = useState(agentName || "AI Assistant");
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useChat();
  const { data: persistentMessages = [], isLoading: loadingMessages } = useAssistantMessages();
  const saveMessageMutation = useSaveAssistantMessage();
  const { mutateAsync: deleteMessages } = useDeleteAssistantMessages();
  const { speak } = useAgentStore();

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [persistentMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatMutation.isPending) return;
    const msg = chatInput.trim();
    setChatInput("");

    try {
      // 2. Query Assistant
      const response = await chatMutation.mutateAsync({
        prompt: msg,
        type: "mentor", // Backend still uses mentor key internally
        context: { 
          username: userFullName || 'User',
          onboarding_data: {
            goal: userGoal,
            mainWeakness: userWeakness,
            biggestDistraction: biggestDistraction,
            routine: ""
          }
        },
        conversationHistory: persistentMessages.map((m: any) => ({ role: m.role, text: m.text }))
      });
      
      // 2. Show briefly on overlay bubbles
      speak(response.message, 'general', 10000);
    } catch {
      toast.error("Assistant unavailable. Try again.");
    }
  };

  const handleReset = () => {
    if (confirm("This will wipe all onboarding data, personality, and schedule. Are you ready to RESTART?")) { 
      resetMentor(); 
      onClose(); 
      toast.info("Assistant identity reset. Redirecting to onboarding...");
    }
  };

  const handleClearHistory = async () => {
    if (confirm("Clear all chat logs and free up memory?")) {
      await deleteMessages();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black flex items-center justify-center p-4 lg:p-12"
    >
      <div className="w-full h-full flex flex-col bg-[#050505] text-white selection:bg-primary selection:text-black shadow-2xl overflow-hidden ring-1 ring-white/10 max-w-[1400px] lg:rounded-3xl mx-auto">
        {/* Header */}
        <div className="px-8 py-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center glow-primary">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">{agentName || "AI Assistant"} ⚡</h1>
              <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-[0.4em]">Friendly Productivity Companion</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <nav className="flex bg-zinc-900/50 p-1.5 rounded-full border border-white/5 shrink-0">
              <button 
                onClick={() => setActiveTab('war-room')}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'war-room' ? 'bg-primary text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                War Room
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-primary text-black' : 'text-zinc-500 hover:text-white'}`}
              >
                Chat
              </button>
            </nav>

            <button onClick={() => setIsCustomizing(!isCustomizing)} className={`shrink-0 border p-2 rounded-full text-xs font-black transition-all ${isCustomizing ? 'bg-primary/20 border-primary/20 text-primary' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-white hover:bg-zinc-900'}`} title="Customize Agent">
              <Settings2 className="w-4 h-4" />
            </button>
            <button onClick={handleClearHistory} className="shrink-0 bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white py-2 px-4 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
              <Trash2 className="w-4 h-4" /> Clear Chat
            </button>
          </div>
        </div>

        {isCustomizing && (
          <div className="px-8 py-4 bg-zinc-900/40 border-b border-white/5 flex items-center gap-4 animation-fade-in">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">Identity Config</h3>
            <div className="flex items-center gap-2">
              <input 
                value={tempName}
                onChange={e => setTempName(e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/40"
                placeholder="Agent Name..."
              />
              <button onClick={() => { setFullContext({ agentName: tempName }); setIsCustomizing(false); toast.success("Identity updated"); }} className="bg-primary text-black px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all hover:bg-primary/90 flex items-center gap-1">
                <Check className="w-3 h-3" /> Save
              </button>
            </div>
          </div>
        )}

        {/* Global Close */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 lg:top-8 lg:right-8 z-[700] p-4 bg-zinc-900/80 backdrop-blur border border-white/10 rounded-full hover:bg-zinc-800 transition-all shadow-2xl active:scale-90"
        >
          <X className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
        </button>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'war-room' ? (
            <div className="h-full overflow-y-auto p-6 lg:p-12 custom-scrollbar">
              <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                {/* Tactical Briefing */}
                <div className="md:col-span-1 space-y-10">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">Current Objective</p>
                    <h2 className="text-4xl font-black leading-[0.9] text-white uppercase italic">"{userGoal}"</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Time Remaining</p>
                      <p className="text-2xl font-black text-white">{deadlineDays} Days</p>
                    </div>
                    <div className="bg-zinc-900/40 border border-white/5 p-4 rounded-2xl">
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-2xl font-black text-emerald-500 uppercase italic">Active</p>
                    </div>
                  </div>

                  {userWeakness && (
                    <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl relative overflow-hidden group">
                      <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-primary/10 group-hover:scale-110 transition-transform" />
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Focus Note</p>
                      <p className="text-zinc-300 text-lg font-medium leading-relaxed italic relative z-10">
                        "Remember to watch out for <span className="text-white font-black underline decoration-primary decoration-4 underline-offset-4">{userWeakness}</span> today. I believe in you!"
                      </p>
                    </div>
                  )}
                </div>

                {/* Daily Execution Grid */}
                <div className="md:col-span-1 lg:col-span-2 space-y-8">
                  <DailySchedulePanel />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col max-w-4xl mx-auto p-4 lg:p-12">
              <div className="flex-1 overflow-y-auto space-y-10 custom-scrollbar pr-2 lg:pr-6 pb-24">
                {!loadingMessages && persistentMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <Sparkles className="w-12 h-12" />
                    <p className="text-sm font-black uppercase tracking-widest">Assistant Link Established. How can I help?</p>
                  </div>
                )}
                
                {persistentMessages.map((msg: any, i: number) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] lg:max-w-[55%] ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                      <p className={`text-[8px] uppercase font-black tracking-widest mb-1 ${msg.role === 'user' ? 'text-primary' : 'text-zinc-500'}`}>
                        {msg.role === 'user' ? userFullName || 'YOU' : `${agentName || 'AI'} RESPONSE`}
                      </p>
                      <div className={`p-2 lg:p-2.5 rounded-xl text-[11px] lg:text-[12px] font-medium leading-snug whitespace-pre-wrap ${
                        msg.role === 'user' 
                        ? 'bg-zinc-900 border border-primary/20 text-white shadow-lg' 
                        : 'bg-white/5 border border-white/5 text-zinc-100'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} className="h-10" />
              </div>
              
              <div className="absolute bottom-6 left-4 right-4 lg:left-12 lg:right-12 max-w-4xl mx-auto z-10">
                <div className="relative group">
                  <input 
                    value={chatInput} 
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !chatMutation.isPending && handleSendMessage()}
                    placeholder="Type a message..."
                    className="w-full bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-full pl-6 pr-24 lg:px-8 py-4 lg:py-5 text-base lg:text-lg font-medium text-white shadow-2xl focus:outline-none focus:border-primary/40 transition-all placeholder:text-zinc-600"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={chatMutation.isPending || !chatInput.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-primary text-black px-4 lg:px-8 rounded-full font-black text-xs lg:text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-xl shadow-primary/20 flex items-center justify-center min-w-[80px] lg:min-w-[120px]"
                  >
                    {chatMutation.isPending ? "Sending" : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-8 py-6 bg-zinc-900/40 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-12 font-black text-[10px] text-zinc-500 uppercase tracking-[0.4em]">
            <div className="flex items-center gap-3"><RefreshCcw className="w-4 h-4 text-emerald-500" /> Neural Link Active</div>
          </div>
          
          <div className="flex items-center gap-8">
            <button onClick={handleReset} className="text-[10px] font-black text-zinc-600 hover:text-destructive transition-colors uppercase tracking-widest flex items-center gap-2">
              <RefreshCcw className="w-3 h-3" /> Reset Assistant
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
