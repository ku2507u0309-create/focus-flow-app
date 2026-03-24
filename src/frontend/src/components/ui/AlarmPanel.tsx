/**
 * STRICT ALARM ENFORCEMENT SYSTEM
 *
 * Rules:
 * 1. Alarm fires at set time — fullscreen, loud synthetic tone
 * 2. Alarm does NOT stop until user clicks "Task Completed"
 * 3. On first dismiss attempt → mentor pressure message, alarm continues
 * 4. State persisted to localStorage so page refresh doesn't help
 * 5. Mentor sends escalating messages every 30 seconds
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlarmClock, CheckCircle2, Bell, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useAgentStore } from "../../lib/agentStore";
import { getMentorMessage, buildMentorContext } from "../../lib/mentorEngine";
import { useGamificationStore } from "../../lib/gamificationStore";

/* ─── Types ───────────────────────────────────────────────────── */
interface AlarmEntry {
  id: string;
  time: string;   // "HH:MM"
  task: string;
  active: boolean;
  triggered: boolean;
}

const STORAGE_KEY = "focusflow-alarms-v2";
const ACTIVE_KEY  = "focusflow-active-alarm";

/* ─── Web Audio Alarm Tone ───────────────────────────────────── */
let alarmCtx: AudioContext | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;

function startAlarmTone() {
  stopAlarmTone();
  alarmCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const play = () => {
    if (!alarmCtx) return;
    const osc = alarmCtx.createOscillator();
    const gain = alarmCtx.createGain();
    osc.connect(gain);
    gain.connect(alarmCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.5, alarmCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, alarmCtx.currentTime + 0.6);
    osc.start();
    osc.stop(alarmCtx.currentTime + 0.6);
  };
  play();
  alarmInterval = setInterval(play, 1200);
}

function stopAlarmTone() {
  if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }
  if (alarmCtx) { alarmCtx.close(); alarmCtx = null; }
}

/* ─── AlarmPanel ─────────────────────────────────────────────── */
export default function AlarmPanel() {
  const [alarms, setAlarms] = useState<AlarmEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [activeAlarm, setActiveAlarm] = useState<AlarmEntry | null>(() => {
    try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || "null"); } catch { return null; }
  });

  const [newTime, setNewTime] = useState("");
  const [newTask, setNewTask] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [escapeAttempts, setEscapeAttempts] = useState(0);
  const [mentorMsg, setMentorMsg] = useState("");
  const [alarmElapsed, setAlarmElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { agentName, personality, roleModel, userGoal, userWeakness, biggestDistraction, streakDays } = {
    ...useAgentStore(),
    streakDays: useGamificationStore((s) => s.streakDays),
  };
  const { level, xp, tasksCompleted } = useGamificationStore();

  const buildCtx = useCallback(() => buildMentorContext({
    agentName: agentName || "Nova",
    personality,
    roleModel: roleModel || "",
    userGoal: userGoal || "",
    userWeakness: userWeakness || biggestDistraction || "",
    streakDays,
    level,
    xp,
    tasksCompleted,
  }), [agentName, personality, roleModel, userGoal, userWeakness, biggestDistraction, streakDays, level, xp, tasksCompleted]);

  // ── Persist alarms ──
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  }, [alarms]);

  // ── Persist active alarm ──
  useEffect(() => {
    if (activeAlarm) {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeAlarm));
      startAlarmTone();
    } else {
      localStorage.removeItem(ACTIVE_KEY);
      stopAlarmTone();
    }
    return () => stopAlarmTone();
  }, [activeAlarm]);

  // ── Restore active alarm on mount (if page was refreshed during alarm) ──
  useEffect(() => {
    if (activeAlarm) {
      setMentorMsg(getMentorMessage("alarm_trigger", buildCtx()));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Check alarms every 30 seconds ──
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hhmm = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      setAlarms((prev) => {
        const updated = prev.map((a) => {
          if (a.active && !a.triggered && a.time === hhmm) {
            const triggered = { ...a, triggered: true };
            setActiveAlarm(triggered);
            setMentorMsg(getMentorMessage("alarm_trigger", buildCtx()));
            return triggered;
          }
          return a;
        });
        return updated;
      });
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [buildCtx]);

  // ── Escalating mentor messages every 30s while alarm is active ──
  useEffect(() => {
    if (!activeAlarm) { if (elapsedRef.current) clearInterval(elapsedRef.current); return; }
    elapsedRef.current = setInterval(() => {
      setAlarmElapsed((t) => {
        const next = t + 30;
        // Escalate every 30 seconds
        const trigger = next >= 120 ? "alarm_delay" : "alarm_trigger";
        setMentorMsg(getMentorMessage(trigger, buildCtx()));
        return next;
      });
    }, 30_000);
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [activeAlarm, buildCtx]);

  const addAlarm = () => {
    if (!newTime || !newTask.trim()) return;
    const entry: AlarmEntry = { id: Date.now().toString(), time: newTime, task: newTask.trim(), active: true, triggered: false };
    setAlarms((a) => [...a, entry]);
    setNewTime(""); setNewTask(""); setShowForm(false);
  };

  const removeAlarm = (id: string) => setAlarms((a) => a.filter((x) => x.id !== id));

  const handleComplete = () => {
    if (!activeAlarm) return;
    stopAlarmTone();
    setAlarms((prev) => prev.map((a) => a.id === activeAlarm.id ? { ...a, active: false } : a));
    setActiveAlarm(null);
    setEscapeAttempts(0);
    setAlarmElapsed(0);
    useAgentStore.getState().speak(getMentorMessage("task_complete", buildCtx()), "compliment", 6000);
  };

  const handleEscapeAttempt = () => {
    const next = escapeAttempts + 1;
    setEscapeAttempts(next);
    const msg = next >= 3
      ? "The alarm stays on. You set this task for a reason. Complete it now."
      : getMentorMessage("alarm_delay", buildCtx());
    setMentorMsg(msg);
  };

  /* ── Active Alarm Fullscreen ──────────────────────────────── */
  return (
    <>
      <AnimatePresence>
        {activeAlarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center"
          >
            {/* Pulsing red ring */}
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute w-80 h-80 rounded-full border-4 border-red-500/60"
              style={{ filter: "drop-shadow(0 0 40px #ef4444)" }}
            />

            {/* Bell icon */}
            <motion.div
              animate={{ rotate: [-18, 18, -18, 18, 0] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              className="relative z-10 w-24 h-24 rounded-full bg-red-500/15 border border-red-500/40 flex items-center justify-center mb-8"
            >
              <Bell className="w-12 h-12 text-red-500" />
            </motion.div>

            {/* Time */}
            <p className="text-7xl font-black text-white z-10 tabular-nums tracking-tight mb-2">
              {activeAlarm.time}
            </p>

            {/* Task */}
            <div className="z-10 glass-card border-white/10 px-6 py-3 max-w-sm text-center mb-6">
              <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Task alarm</p>
              <p className="text-xl font-black text-white leading-tight">{activeAlarm.task}</p>
              {alarmElapsed > 0 && (
                <p className="text-xs text-red-400/70 mt-2">Alarm ringing for {Math.floor(alarmElapsed / 60)} min {alarmElapsed % 60}s</p>
              )}
            </div>

            {/* Mentor message */}
            {mentorMsg && (
              <motion.div key={mentorMsg} initial={{ y:8, opacity:0 }} animate={{ y:0, opacity:1 }}
                className="z-10 glass-card-strong px-5 py-3 max-w-xs text-center mb-8"
              >
                <p className="text-[10px] font-black text-red-400 uppercase tracking-wider mb-1">{agentName || "Nova"}</p>
                <p className="text-sm text-white/90 font-medium">&ldquo;{mentorMsg}&rdquo;</p>
              </motion.div>
            )}

            {/* Complete button */}
            <motion.button type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              className="z-10 px-10 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-lg flex items-center gap-3 shadow-2xl transition-all"
            >
              <CheckCircle2 className="w-6 h-6" />
              Task Completed
            </motion.button>

            {/* Dismiss attempt (triggers mentor, doesn't stop alarm) */}
            <button type="button" onClick={handleEscapeAttempt}
              className="z-10 mt-4 text-white/25 text-xs hover:text-white/40 transition-colors"
            >
              Try to dismiss...
            </button>
            {escapeAttempts > 0 && (
              <p className="z-10 mt-2 text-red-400/70 text-xs text-center max-w-xs">
                This alarm will NOT stop. You set this commitment. Honor it.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Alarm Manager UI ─────────────────────────────────── */}
      <div className="max-w-lg mx-auto space-y-5">
        <div className="glass-card-strong p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-overline flex items-center gap-1.5">
                <AlarmClock className="w-3.5 h-3.5" /> Alarm System
              </p>
              <h2 className="section-title">Task Enforcement</h2>
            </div>
            <motion.button type="button" whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm((v) => !v)}
              className="btn-premium px-3 py-2 flex items-center gap-1.5 text-sm font-bold"
            >
              <Plus className="w-4 h-4" /> Add Alarm
            </motion.button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Alarms will NOT stop until you mark the task as completed. No escape.
          </p>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="glass-card-strong p-5 space-y-3"
            >
              <p className="font-bold text-foreground">New Alarm</p>
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input type="text" placeholder="What task must be done?" value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addAlarm()}
                className="w-full px-3 py-2.5 rounded-xl border border-border/40 bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="flex gap-2">
                <button type="button" onClick={addAlarm}
                  className="flex-1 btn-premium py-2.5 font-bold text-sm"
                >Set Alarm</button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-border/30 text-muted-foreground hover:bg-secondary text-sm transition-all"
                >Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alarm list */}
        {alarms.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <AlarmClock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No alarms set yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Add an alarm to enforce your commitments.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alarms.map((alarm) => (
              <div key={alarm.id}
                className={`glass-card px-4 py-3 flex items-center gap-3 ${alarm.triggered ? "border-red-500/30 bg-red-500/5" : !alarm.active ? "opacity-50" : ""}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${alarm.active ? "bg-primary/15" : "bg-secondary"}`}>
                  <AlarmClock className={`w-5 h-5 ${alarm.active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-foreground tabular-nums">{alarm.time}</p>
                  <p className="text-sm text-muted-foreground truncate">{alarm.task}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {alarm.triggered && <span className="text-xs text-red-400 font-bold">RINGING</span>}
                  {!alarm.active && !alarm.triggered && <span className="text-xs text-emerald-400 font-bold">Done</span>}
                  <button type="button" onClick={() => removeAlarm(alarm.id)}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
