import { motion, AnimatePresence } from "motion/react";
import { Bot, Sparkles, X, ChevronRight, ChevronLeft, ExternalLink, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useAgentStore, type AgentPersonality } from "../../lib/agentStore";
import { useAutoAssistant } from "../../hooks/useAutoAssistant";

/* ─────────────────────────────────────────────
   9-STEP DEEP ONBOARDING
   ───────────────────────────────────────────── */

type StepId = 1|2|3|4|5|6|7;

interface StepConfig {
  title: string;
  subtitle: (ctx: OnboardingState) => string;
  field: keyof OnboardingState;
  type: "text" | "textarea" | "number" | "routine";
  placeholder?: string;
  hint?: string;
}

const STEPS: StepConfig[] = [
  {
    title: "1. Your main goal",
    subtitle: () => "What is the single most important thing you want to achieve?",
    field: "userGoal",
    type: "textarea",
    placeholder: "e.g. Build a $10K/mo business, Crack JEE, Ship my app...",
  },
  {
    title: "2. Why does this matter?",
    subtitle: () => "If this doesn't matter deeply, you will quit.",
    field: "reason",
    type: "textarea",
    placeholder: "I want to prove it to myself, secure financial freedom...",
  },
  {
    title: "3. Deadline (Days)",
    subtitle: () => "A goal without a deadline is a delusion.",
    field: "deadlineDays",
    type: "number",
  },
  {
    title: "4. Your biggest distraction",
    subtitle: () => "What steals your time the most?",
    field: "biggestDistraction",
    type: "textarea",
    placeholder: "Instagram, YouTube, endlessly planning without executing...",
  },
  {
    title: "5. When do you lose focus?",
    subtitle: () => "Identify the friction point in your day.",
    field: "weakTime",
    type: "textarea",
    placeholder: "Right after lunch, late at night, when tasks get hard...",
  },
  {
    title: "6. Your main weakness",
    subtitle: () => "Be brutal. Awareness is the first step to control.",
    field: "userWeakness",
    type: "textarea",
    placeholder: "I procrastinate on hard tasks, I give up when stressed...",
  },
  {
    title: "7. Daily routine",
    subtitle: () => "Set your wake up time and required focus hours.",
    field: "wakeTime",
    type: "routine",
  },
];

interface OnboardingState {
  userGoal: string;
  reason: string;
  deadlineDays: number;
  biggestDistraction: string;
  weakTime: string;
  userWeakness: string;
  wakeTime: string;
  focusHours: number;
}

// ── Quick Reply Tray ────────────────────────────────────────────────────────
interface QuickTrayProps {
  onOpenFull: () => void;
  onClose: () => void;
  agentName: string;
}

const QUICK_REPLIES = [
  { label: "I'm focused ✅", type: "focused" as const },
  { label: "Need a break 😮‍💨", type: "break" as const },
];

const NUDGES = [
  "What's your next task right now? 🎯",
  "Time to take action. No more planning! ⚡",
  "Stay focused — you're closer than you think. 💪",
  "Quick check-in: are you on track today?",
];

function QuickTray({ onOpenFull, onClose, agentName }: QuickTrayProps) {
  const { speak } = useAgentStore();
  const nudge = NUDGES[Math.floor(Date.now() / 60000) % NUDGES.length];

  const handleReply = (type: "focused" | "break") => {
    if (type === "focused") {
      speak("That's the spirit! Keep the momentum going 🔥", "compliment", 5000);
    } else {
      speak("Take a 5-min break. Breathe. Then come back stronger. 🧘", "general", 6000);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.9 }}
      className="rounded-2xl rounded-br-sm p-4 shadow-2xl w-[280px] pointer-events-auto border border-white/15 bg-zinc-900 backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full premium-gradient-bg flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">{agentName || "AI"}</span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Nudge message */}
      <p className="text-sm font-medium text-white leading-relaxed mb-3 pl-0.5">{nudge}</p>

      {/* Quick replies */}
      <div className="space-y-1.5 mb-3">
        {QUICK_REPLIES.map(qr => (
          <button
            key={qr.type}
            onClick={() => handleReply(qr.type)}
            className="w-full text-left text-xs font-semibold px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white transition-all border border-white/10 hover:border-white/20"
          >
            {qr.label}
          </button>
        ))}
      </div>

      {/* Open full AI */}
      <button
        onClick={onOpenFull}
        className="w-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 text-black px-3 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg"
      >
        <ExternalLink className="w-3.5 h-3.5" /> Open Full AI
      </button>
    </motion.div>
  );
}

// ── Main Overlay ─────────────────────────────────────────────────────────────
export default function AIAgentOverlay() {
  const { messages, isVisible, clearMessage, agentName, onboardingDone, setFullContext } = useAgentStore();

  useAutoAssistant();

  // Auto-dismiss safety
  useEffect(() => {
    if (messages.length > 0) {
      const timers = messages.map(msg => 
        setTimeout(() => clearMessage(msg.id), 12000)
      );
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [messages, clearMessage]);

  const [step, setStep] = useState<StepId>(1);
  const [showTray, setShowTray] = useState(false);
  const [form, setForm] = useState<OnboardingState>({
    userGoal:           "",
    reason:             "",
    deadlineDays:       30,
    biggestDistraction: "",
    weakTime:           "",
    userWeakness:       "",
    wakeTime:           "06:00",
    focusHours:         4,
  });

  const showOnboarding = !onboardingDone;
  const totalSteps     = STEPS.length;

  const update = (field: keyof OnboardingState, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const canNext = (): boolean => {
    const cfg = STEPS[step - 1];
    if (cfg.type === "routine") return form.wakeTime.length > 0 && form.focusHours > 0;
    if (cfg.type === "number") return Number(form[cfg.field as keyof OnboardingState]) > 0;
    const val = String(form[cfg.field as keyof OnboardingState]);
    return val.trim().length > 0;
  };

  const handleFinish = () => {
    setFullContext({
      agentName:           "AI Assistant",
      personality:         "friendly",
      userFullName:        "User",
      userGoal:            form.userGoal,
      reason:              form.reason,
      deadlineDays:        form.deadlineDays,
      biggestDistraction:  form.biggestDistraction,
      weakTime:            form.weakTime,
      userWeakness:        form.userWeakness,
      style:               "friendly",
      roleModel:           "AI Assistant",
      whyRoleModel:        "",
      wakeTime:            form.wakeTime,
      focusHours:          form.focusHours,
      consequence:         "",
      commitment:          "",
      onboardingDone:      true,
    });
    setTimeout(() => {
      useAgentStore.getState().speak(
        `Setup complete! I'm your AI Assistant. Let's crush your goals today. ⚡`,
        "greeting",
        8000
      );
    }, 500);
  };

  const goNext = () => {
    if (!canNext()) return;
    if (step < totalSteps) setStep((s) => (s + 1) as StepId);
    else handleFinish();
  };

  const goPrev = () => { if (step > 1) setStep((s) => (s - 1) as StepId); };

  const renderField = (cfg: StepConfig) => {
    if (cfg.type === "routine") {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Wake Time</label>
            <input type="time" value={form.wakeTime} onChange={(e) => update("wakeTime", e.target.value)}
              className="premium-input text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Focus Target</label>
            <div className="flex items-center gap-4 bg-muted/20 border border-border/40 p-3 rounded-xl">
              <input type="range" min={1} max={16} value={form.focusHours} onChange={(e) => update("focusHours", Number(e.target.value))}
                className="w-full h-2 rounded-full cursor-pointer accent-primary"
              />
              <span className="text-primary font-black text-xl w-8 text-right">{form.focusHours}h</span>
            </div>
          </div>
        </div>
      );
    }

    if (cfg.type === "number") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-4xl font-black premium-gradient-text">{form.deadlineDays}</span>
            <span className="text-muted-foreground text-sm">days</span>
          </div>
          <input type="range" min={1} max={365} value={form.deadlineDays}
            onChange={(e) => update("deadlineDays", Number(e.target.value))}
            className="w-full h-2 rounded-full cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1d</span><span>1 month</span><span>3 months</span><span>1 year</span>
          </div>
          <input type="number" min={1} max={365} value={form.deadlineDays}
            onChange={(e) => update("deadlineDays", Number(e.target.value))}
            className="premium-input text-sm"
          />
        </div>
      );
    }

    if (cfg.type === "textarea") {
      return (
        <textarea
          autoFocus
          value={String(form[cfg.field as keyof OnboardingState])}
          onChange={(e) => update(cfg.field as keyof OnboardingState, e.target.value)}
          placeholder={cfg.placeholder}
          rows={4}
          className="premium-input text-sm resize-none"
        />
      );
    }

    return (
      <input
        autoFocus type="text"
        value={String(form[cfg.field as keyof OnboardingState])}
        onChange={(e) => update(cfg.field as keyof OnboardingState, e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && goNext()}
        placeholder={cfg.placeholder}
        className="premium-input text-sm"
      />
    );
  };

  if (!isVisible) return null;

  const cfg = STEPS[step - 1];
  const pct = (step / totalSteps) * 100;

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex items-end justify-end pointer-events-none">
        <div className="flex flex-col items-end gap-3 max-w-[320px]">

          {/* ── Onboarding ── */}
          <AnimatePresence mode="wait">
            {showOnboarding && (
              <motion.div
                key="onboarding"
                initial={{ opacity: 0, y: 20, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card-strong rounded-2xl rounded-br-sm p-5 shadow-2xl pointer-events-auto w-[310px] z-[60]"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <motion.div
                      className="h-full premium-gradient-bg rounded-full"
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-bold">{step}/{totalSteps}</span>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22 }}
                  >
                    <p className="text-base font-black text-foreground mb-0.5">{cfg.title}</p>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{cfg.subtitle(form)}</p>
                    {renderField(cfg)}
                  </motion.div>
                </AnimatePresence>

                <div className="flex items-center gap-2 mt-4">
                  {step > 1 && (
                    <button type="button" onClick={goPrev}
                      className="p-2 rounded-xl border border-border/30 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button" onClick={goNext} disabled={!canNext()}
                    className="flex-1 btn-premium text-sm flex items-center justify-center gap-1.5 disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    {step < totalSteps ? (
                      <><span>Continue</span><ChevronRight className="w-4 h-4" /></>
                    ) : (
                      <><span>Activate AI Assistant</span><span>⚡</span></>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Speak Bubbles (Nudge messages) ── */}
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <motion.div key={msg.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                className="relative glass-card-strong text-foreground p-3.5 rounded-2xl rounded-br-sm shadow-xl pointer-events-auto max-w-[290px] z-[70] border border-white/10"
              >
                <button type="button" onClick={() => clearMessage(msg.id)}
                  className="absolute -top-2 -right-2 bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground p-0.5 rounded-full transition-colors border border-border/50"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full premium-gradient-bg flex items-center justify-center shrink-0">
                    <Zap className="w-2.5 h-2.5 text-white" />
                  </div>
                  <p className="text-[9px] text-primary font-black uppercase tracking-widest">{agentName || "AI Assistant"}</p>
                </div>
                <p className="text-sm leading-relaxed pr-2">{msg.text}</p>
                {msg.type === "compliment" && (
                  <Sparkles className="absolute -top-3 -left-3 w-6 h-6 text-yellow-400 rotate-12 drop-shadow-md" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* ── Quick Reply Tray ── */}
          <AnimatePresence>
            {showTray && onboardingDone && (
              <QuickTray
                agentName={agentName || "AI Assistant"}
                onOpenFull={() => { 
                  setShowTray(false); 
                  window.dispatchEvent(new CustomEvent("navigate-to-ai-agent"));
                }}
                onClose={() => setShowTray(false)}
              />
            )}
          </AnimatePresence>

          {/* ── Agent Avatar Button ── */}
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (!onboardingDone) return;
              setShowTray(prev => !prev);
            }}
            className={`w-14 h-14 rounded-full premium-gradient-bg flex items-center justify-center cursor-pointer border-[3px] border-white/20 pointer-events-auto shadow-xl z-[80] ${messages.length === 0 ? "agent-pulse" : ""}`}
            title={onboardingDone ? "Quick Actions" : "Set up your assistant"}
          >
            <Bot className="w-7 h-7 text-white" />
          </motion.button>
        </div>
      </div>

    </>
  );
}
