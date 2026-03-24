import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface AlarmScreenProps {
  taskName: string;
  dueLabel: string;         // e.g. "Due now" or "5 minutes ago"
  onComplete: () => void;   // dismiss + mark complete
  onSnooze?: () => void;    // optional snooze
}

export default function AlarmScreen({ taskName, dueLabel, onComplete, onSnooze }: AlarmScreenProps) {
  const [pulse, setPulse] = useState(false);

  // Red pulsing border every 2s
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center alarm-bg"
      >
        {/* Animated background ring */}
        <motion.div
          animate={{ scale: pulse ? 1.04 : 1, opacity: pulse ? 0.2 : 0.1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="absolute w-[500px] h-[500px] rounded-full border-4 border-red-500 pointer-events-none"
          style={{ filter: "blur(2px)" }}
        />
        <motion.div
          animate={{ scale: pulse ? 1.08 : 0.96, opacity: pulse ? 0.1 : 0.06 }}
          transition={{ duration: 0.6, ease: "easeInOut", delay: 0.1 }}
          className="absolute w-[700px] h-[700px] rounded-full border-2 border-red-400 pointer-events-none"
          style={{ filter: "blur(4px)" }}
        />

        {/* Card */}
        <motion.div
          initial={{ y: 30, scale: 0.95 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ type: "spring", damping: 20 }}
          className="glass-card-strong p-8 max-w-sm w-full mx-6 text-center relative overflow-hidden"
        >
          {/* Red glow top bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-400 to-red-500" />

          <motion.div
            animate={{ rotate: [0, -5, 5, -5, 5, 0] }}
            transition={{ repeat: Infinity, repeatDelay: 2, duration: 0.5 }}
            className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-5"
          >
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </motion.div>

          <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-2">⚠️ Task Alert</p>
          <h2 className="text-2xl font-black text-foreground leading-tight mb-2">{taskName}</h2>

          <div className="flex items-center justify-center gap-1.5 mb-6">
            <Clock className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-orange-400">{dueLabel}</span>
          </div>

          <p className="text-sm text-muted-foreground mb-7 leading-relaxed">
            Your focus time is here. It's time to act — the world doesn't wait.
          </p>

          {/* Complete button */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onComplete}
            className="w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2 mb-3"
            style={{
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "white",
              boxShadow: "0 4px 20px rgba(34,197,94,0.4)",
            }}
          >
            <CheckCircle2 className="w-5 h-5" />
            Complete Task
          </motion.button>

          {onSnooze && (
            <button
              type="button"
              onClick={onSnooze}
              className="w-full py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              Snooze 10 min
            </button>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
