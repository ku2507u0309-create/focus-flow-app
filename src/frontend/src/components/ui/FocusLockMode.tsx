import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Coffee, Target, X, Brain, Settings2, ChevronRight } from "lucide-react";
import { useAgentStore } from "../../lib/agentStore";
import { useGamificationStore } from "../../lib/gamificationStore";
import { getMentorMessage, buildMentorContext, type MentorTrigger } from "../../lib/mentorEngine";

interface FocusLockModeProps {
  taskName?: string;
  onExit: () => void;
}

/* ── Setup Screen ────────────────────────────────────────────── */
interface SetupScreenProps {
  onStart: (focusMins: number, breakMins: number, task: string) => void;
  onCancel: () => void;
  defaultTask?: string;
}

function SetupScreen({ onStart, onCancel, defaultTask = "" }: SetupScreenProps) {
  const [focusHours, setFocusHours] = useState(0);
  const [focusMins, setFocusMins] = useState(25);
  const [breakMins, setBreakMins] = useState(5);
  const [task, setTask] = useState(defaultTask);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center focus-lock-bg"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob absolute w-80 h-80 opacity-10 top-10 left-10 bg-primary" style={{ filter: "blur(50px)" }} />
        <div className="blob blob-2 absolute w-64 h-64 opacity-8 bottom-20 right-16 bg-accent" style={{ filter: "blur(60px)" }} />
      </div>

      <motion.div
        initial={{ y: 30, scale: 0.95, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 22 }}
        className="glass-card-strong p-7 max-w-sm w-full mx-5 relative"
      >
        <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-black text-foreground text-base leading-tight">Setup Session</p>
            <p className="text-muted-foreground text-xs">Configure your focus block</p>
          </div>
        </div>

        {/* Task */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Task</label>
          <input
            type="text"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="What will you work on?"
            className="premium-input text-sm"
          />
        </div>

        {/* Focus Duration */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Focus Time</label>
            <span className="text-primary font-black text-lg">{focusHours > 0 && `${focusHours}h `}{focusMins > 0 ? `${focusMins}m` : ""}</span>
          </div>
          <div className="flex gap-2">
            <input type="number" min={0} max={24} value={focusHours === 0 ? "" : focusHours} 
              onChange={(e) => setFocusHours(Number(e.target.value) || 0)} 
              className="premium-input text-sm w-full py-2" placeholder="Hrs" 
            />
            <input type="number" min={0} max={59} value={focusMins === 0 ? "" : focusMins} 
              onChange={(e) => setFocusMins(Number(e.target.value) || 0)} 
              className="premium-input text-sm w-full py-2 bg-zinc-900" placeholder="Mins" 
            />
          </div>
        </div>

        {/* Break Duration */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Break Time (Mins)</label>
            <span className="text-emerald-400 font-black text-lg">{breakMins >= 60 && `${Math.floor(breakMins / 60)}h `}{breakMins % 60 > 0 || breakMins < 60 ? `${breakMins % 60}m` : ""}</span>
          </div>
          <input type="number" min={1} max={120} value={breakMins}
            onChange={(e) => setBreakMins(Number(e.target.value) || 0)}
            className="premium-input text-sm w-full py-2"
            placeholder="e.g. 15"
          />
        </div>

        {/* Summary */}
        <div className="flex gap-2 mb-5">
          <div className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-3 text-center">
            <p className="text-primary font-black text-xl">{focusHours * 60 + focusMins}</p>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mt-0.5">Focus min</p>
          </div>
          <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
            <p className="text-emerald-500 font-black text-xl">{breakMins}</p>
            <p className="text-emerald-600/60 dark:text-emerald-400/60 text-[10px] uppercase tracking-wider mt-0.5">Break min</p>
          </div>
          <div className="flex-1 bg-muted/20 border border-border/40 rounded-xl p-3 text-center">
            <p className="text-accent font-black text-xl">{focusHours * 60 + focusMins + breakMins}</p>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider mt-0.5">Total min</p>
          </div>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => onStart(focusHours * 60 + focusMins, breakMins, task)}
          className="btn-premium w-full py-3.5 text-base font-black flex items-center justify-center gap-2"
        >
          <Brain className="w-5 h-5" />
          Start Focus Session
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// Mentor check-in intervals (in elapsed minutes)
const FOCUS_CHECKINS = [
  { minElapsed: 5,  trigger: 'if_i_were_you_focus' as MentorTrigger },
  { minElapsed: 10, trigger: 'focus_mid' as MentorTrigger },
  { minElapsed: 15, trigger: 'idle' as MentorTrigger },
  { minElapsed: 20, trigger: 'focus_mid' as MentorTrigger },
];

export default function FocusLockMode({ taskName: defaultTask = "Deep Work Session", onExit }: FocusLockModeProps) {
  // ── Setup state (shown before the timer) ──
  const [setupDone, setSetupDone] = useState(false);
  const [focusDuration, setFocusDuration] = useState(25 * 60); // seconds
  const [breakDuration, setBreakDuration] = useState(5 * 60);  // seconds
  const [activeTaskName, setActiveTaskName] = useState(defaultTask);

  const [isBreak, setIsBreak] = useState(false);
  const [timeLeft, setTimeLeft] = useState(focusDuration);
  const [running, setRunning] = useState(false);
  const [mentorMsg, setMentorMsg] = useState("");
  const [sessions, setSessions] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const { agentName, personality, roleModel, userGoal, userWeakness } = useAgentStore();
  const { addFocusMinutes, streakDays, level, xp, tasksCompleted } = useGamificationStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const focusedSecondsRef = useRef(0);
  const lastCheckinRef = useRef(-1);
  const displayName = agentName || "Nova";

  const total = isBreak ? breakDuration : focusDuration;
  const pct = ((total - timeLeft) / total) * 100;

  const buildCtx = () => buildMentorContext({
    agentName: displayName,
    personality,
    roleModel,
    userGoal,
    userWeakness,
    streakDays,
    level,
    xp,
    tasksCompleted,
  }, { taskName: activeTaskName });

  const fireMentorMsg = (trigger: MentorTrigger) => {
    const msg = getMentorMessage(trigger, buildCtx());
    setMentorMsg(msg);
    useAgentStore.getState().speak(msg, 'general', 5000);
  };

  // Fire task_start message when setup completes
  useEffect(() => {
    if (setupDone) fireMentorMsg('task_start');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupDone]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (!isBreak) {
            focusedSecondsRef.current++;
            const elapsedMin = Math.floor(focusedSecondsRef.current / 60);
            const nextCheckin = FOCUS_CHECKINS.find(
              (c) => c.minElapsed === elapsedMin && lastCheckinRef.current !== elapsedMin
            );
            if (nextCheckin) {
              lastCheckinRef.current = elapsedMin;
              fireMentorMsg(nextCheckin.trigger);
            }
          }
          const next = t - 1;
          if (next <= 0) {
            clearInterval(intervalRef.current!);
            if (!isBreak) {
              addFocusMinutes(Math.floor(focusedSecondsRef.current / 60));
              focusedSecondsRef.current = 0;
              lastCheckinRef.current = -1;
              setSessions((s) => s + 1);
              setIsBreak(true);
              setTimeLeft(breakDuration);
              fireMentorMsg('focus_end');
            } else {
              setIsBreak(false);
              setTimeLeft(focusDuration);
              fireMentorMsg('task_start');
            }
            setRunning(false);
          }
          return next;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, isBreak]);

  // ── Show Setup Screen first ──
  if (!setupDone) {
    return (
      <AnimatePresence>
        <SetupScreen
          key="setup"
          defaultTask={defaultTask}
          onCancel={onExit}
          onStart={(focusMins, breakMins, task) => {
            setFocusDuration(focusMins * 60);
            setBreakDuration(breakMins * 60);
            setTimeLeft(focusMins * 60);
            setActiveTaskName(task || defaultTask);
            setSetupDone(true);
          }}
        />
      </AnimatePresence>
    );
  }

  const handleExitClick = () => {
    if (running) {
      fireMentorMsg('focus_exit_attempt');
      setShowExitConfirm(true);
    } else {
      onExit();
    }
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const circumference = 2 * Math.PI * 110;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[200] flex flex-col items-center justify-center ${isBreak
          ? "bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900"
          : "focus-lock-bg"}`}
      >
        {/* Floating blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`blob absolute w-80 h-80 opacity-10 top-10 left-10 ${isBreak ? "bg-emerald-400" : "bg-primary"}`} style={{ filter: "blur(50px)" }} />
          <div className={`blob blob-2 absolute w-64 h-64 opacity-8 bottom-20 right-16 ${isBreak ? "bg-teal-400" : "bg-accent"}`} style={{ filter: "blur(60px)" }} />
          <div className="blob blob-3 absolute w-48 h-48 opacity-6 top-1/2 right-1/3 bg-primary" style={{ filter: "blur(70px)" }} />
        </div>

        {/* Exit button */}
        <button type="button" onClick={handleExitClick}
          className="absolute top-5 right-5 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all"
          title="Exit Focus Mode"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Exit confirm pop-up */}
        <AnimatePresence>
          {showExitConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-14 right-5 glass-card-strong p-4 rounded-2xl max-w-[220px] text-center"
            >
              <p className="text-xs text-primary font-bold mb-1">{displayName}</p>
              <p className="text-sm text-white/80 mb-3 italic">&ldquo;{mentorMsg}&rdquo;</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-1.5 text-xs font-bold rounded-xl bg-primary/20 text-primary hover:bg-primary/30 transition-all"
                >Stay</button>
                <button type="button" onClick={onExit}
                  className="flex-1 py-1.5 text-xs font-medium rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-all"
                >Exit</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode label */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center gap-2 mb-8">
          {isBreak
            ? <><Coffee className="w-4 h-4 text-emerald-400" /><span className="text-emerald-400 font-bold text-sm uppercase tracking-widest">Break Time</span></>
            : <><Brain className="w-4 h-4 text-primary" /><span className="text-primary font-bold text-sm uppercase tracking-widest">Focus Lock</span></>
          }
          {sessions > 0 && <span className="ml-2 px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-xs">{sessions} sessions</span>}
        </motion.div>

        {/* Circular timer */}
        <div className="relative flex items-center justify-center mb-8">
          <svg width="260" height="260" className="-rotate-90">
            <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <motion.circle
              cx="130" cy="130" r="110" fill="none"
              stroke={isBreak ? "#34d399" : "hsl(var(--primary))"}
              strokeWidth="10" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ filter: `drop-shadow(0 0 14px ${isBreak ? "#34d399" : "hsl(var(--primary))"})` }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-7xl font-black text-white tabular-nums tracking-tight">{mm}:{ss}</span>
            <span className="text-white/40 text-sm mt-1">{isBreak ? "rest" : "focused"}</span>
          </div>
        </div>

        {/* Task name */}
        <div className="flex items-center gap-2 mb-8 px-4 py-2 rounded-2xl bg-white/6 border border-white/10">
          <Target className="w-4 h-4 text-white/40 shrink-0" />
          <span className="text-white/80 text-sm font-medium">{activeTaskName}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-10">
          <button type="button"
            onClick={() => { setRunning(false); setTimeLeft(isBreak ? breakDuration : focusDuration); lastCheckinRef.current = -1; focusedSecondsRef.current = 0; }}
            className="p-3 rounded-2xl bg-white/8 text-white/50 hover:bg-white/15 hover:text-white transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <motion.button type="button" whileTap={{ scale: 0.94 }} onClick={() => setRunning((r) => !r)}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${isBreak ? "bg-emerald-500 hover:bg-emerald-400" : "btn-premium"}`}
          >
            {running ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
          </motion.button>

          <button type="button"
            onClick={() => { setIsBreak((b) => !b); setTimeLeft(isBreak ? focusDuration : breakDuration); setRunning(false); }}
            className="p-3 rounded-2xl bg-white/8 text-white/50 hover:bg-white/15 hover:text-white transition-all"
            title={isBreak ? "Switch to Focus" : "Take a Break"}
          >
            {isBreak ? <Brain className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
          </button>
        </div>

        {/* Mentor message */}
        {mentorMsg && (
          <motion.div key={mentorMsg} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card-strong px-6 py-4 text-center max-w-sm"
          >
            <p className="text-xs font-black text-primary mb-1.5 uppercase tracking-wider">{displayName}</p>
            <p className="text-white/85 text-sm leading-relaxed font-medium">&ldquo;{mentorMsg}&rdquo;</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
