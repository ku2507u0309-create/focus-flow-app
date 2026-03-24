import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
import { Flame, Target, Zap, X } from "lucide-react";
import { useAgentStore } from "../../lib/agentStore";
import { useGamificationStore } from "../../lib/gamificationStore";

const HOOK_MESSAGES = [
  (agentName: string, streak: number) =>
    streak > 1
      ? `🔥 Don't break your ${streak}-day streak today, ${agentName} believes in you!`
      : `⚡ ${agentName} has a mission lined up for you today.`,
  (_: string, streak: number) =>
    streak > 3
      ? `🔥 ${streak} days strong! You're building a habit that will change your life.`
      : `🎯 You're close to your goal — one great session away.`,
  (agentName: string) => `👀 ${agentName} is watching. Don't disappoint yourself today.`,
  () => "⚡ Peak performance window: the next 2 hours. Start now.",
  () => "🎯 Great work starts with a single decision. Make it now.",
];

export default function HookBanner() {
  const { agentName } = useAgentStore();
  const { streakDays } = useGamificationStore();
  const [visible, setVisible] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);

  const displayName = agentName || "Nova";

  // Rotate messages every 8 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % HOOK_MESSAGES.length);
    }, 8000);
    return () => clearInterval(id);
  }, []);

  const message = HOOK_MESSAGES[msgIndex](displayName, streakDays);
  const isStreak = message.includes("🔥");
  const isGoal = message.includes("🎯");

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="overflow-hidden shrink-0"
        >
          <div
            className={`relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${
              isStreak
                ? "bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-b border-orange-500/20"
                : isGoal
                ? "bg-gradient-to-r from-primary/8 to-accent/5 border-b border-primary/20"
                : "bg-gradient-to-r from-primary/6 to-transparent border-b border-border/30"
            }`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isStreak ? (
                <Flame className="w-4 h-4 text-orange-400 shrink-0" />
              ) : isGoal ? (
                <Target className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Zap className="w-4 h-4 text-primary shrink-0" />
              )}
              <motion.span
                key={msgIndex}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.3 }}
                className={isStreak ? "text-orange-300" : "text-foreground/75"}
              >
                {message}
              </motion.span>
            </div>
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="shrink-0 p-1 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-secondary transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
