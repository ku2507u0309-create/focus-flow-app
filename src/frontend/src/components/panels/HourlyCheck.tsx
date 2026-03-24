import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Minus, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ProductivityStatus,
  getTodayProductivityLog,
  setProductivityHour,
  todayStr,
} from "../../utils/localStorage";
import { useAgentStore } from "../../lib/agentStore";
import { useGamificationStore } from "../../lib/gamificationStore";
import { getMentorMessage, getHourlyTrigger, buildMentorContext } from "../../lib/mentorEngine";

interface HourlyCheckProps {
  userId: string;
}

const STATUS_OPTIONS: Array<{
  label: ProductivityStatus;
  icon: React.ElementType;
  color: string;
  bg: string;
  ocid: string;
}> = [
  {
    label: "Productive",
    icon: Zap,
    color: "text-success",
    bg: "bg-success/10 border-success/25 hover:bg-success/20",
    ocid: "productivity.productive_button",
  },
  {
    label: "Neutral",
    icon: Minus,
    color: "text-warning",
    bg: "bg-warning/10 border-warning/25 hover:bg-warning/20",
    ocid: "productivity.neutral_button",
  },
  {
    label: "Wasted",
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/25 hover:bg-destructive/20",
    ocid: "productivity.wasted_button",
  },
];

const HOUR_CHECK_INTERVAL = 60 * 60 * 1000;

export default function HourlyCheck({ userId }: HourlyCheckProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentHour, setCurrentHour] = useState<string>("");
  const [log, setLog] = useState<Record<string, ProductivityStatus>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const reloadLog = useCallback(() => {
    const l = getTodayProductivityLog(userId);
    setLog(l);
  }, [userId]);

  const fireMentorHourlyMessage = useCallback((hour: number, wasted: boolean) => {
    const agentState = useAgentStore.getState();
    const gamState = useGamificationStore.getState();
    const ctx = buildMentorContext({
      agentName: agentState.agentName,
      personality: agentState.personality,
      roleModel: agentState.roleModel,
      userGoal: agentState.userGoal,
      userWeakness: agentState.userWeakness,
      streakDays: gamState.streakDays,
      level: gamState.level,
      xp: gamState.xp,
      tasksCompleted: gamState.tasksCompleted,
    });
    const trigger = getHourlyTrigger(hour, wasted);
    const msg = getMentorMessage(trigger, ctx);
    agentState.speak(msg, 'general', 7000);
  }, []);

  const checkHour = useCallback(() => {
    reloadLog();
    const now = new Date();
    const hour = now.getHours();
    const hourStr = hour.toString().padStart(2, "0");
    const logNow = getTodayProductivityLog(userId);

    if (!logNow[hourStr]) {
      setCurrentHour(hourStr);
      setShowModal(true);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⏱ Productivity Check", {
          body: `How was the ${hourStr}:00 hour?`,
          icon: "/favicon.ico",
        });
      }

      // Fire hourly mentor message. Check last hour's log to see if "Wasted"
      const prevHourStr = (hour - 1 >= 0 ? hour - 1 : 0).toString().padStart(2, "0");
      const prevStatus = logNow[prevHourStr];
      const wastedLastHour = prevStatus === "Wasted";
      fireMentorHourlyMessage(hour, wastedLastHour);
    }
  }, [userId, reloadLog, fireMentorHourlyMessage]);

  useEffect(() => {
    const initialCheck = setTimeout(checkHour, 2000);
    timerRef.current = setInterval(checkHour, HOUR_CHECK_INTERVAL);
    return () => {
      clearTimeout(initialCheck);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [checkHour]);

  const handleSelect = (status: ProductivityStatus) => {
    setProductivityHour(userId, todayStr(), currentHour, status);
    reloadLog();
    setShowModal(false);

    // Fire mentor reaction based on their selection
    const agentState = useAgentStore.getState();
    const gamState = useGamificationStore.getState();
    const ctx = buildMentorContext({
      agentName: agentState.agentName,
      personality: agentState.personality,
      roleModel: agentState.roleModel,
      userGoal: agentState.userGoal,
      userWeakness: agentState.userWeakness,
      streakDays: gamState.streakDays,
      level: gamState.level,
      xp: gamState.xp,
      tasksCompleted: gamState.tasksCompleted,
    });

    if (status === "Wasted") {
      const msg = getMentorMessage('idle', ctx);
      setTimeout(() => agentState.speak(msg, 'pressure', 8000), 1000);
    } else if (status === "Productive") {
      const msg = getMentorMessage('task_complete', ctx);
      setTimeout(() => agentState.speak(msg, 'compliment', 6000), 500);
    }
  };

  const hours24 = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

  const getHourColor = (h: string): string => {
    const s = log[h];
    if (!s) return "rgba(128,128,128,0.08)";
    if (s === "Productive") return "hsl(142 71% 45%)";
    if (s === "Neutral") return "hsl(37 92% 50%)";
    return "hsl(0 84% 60%)";
  };

  const agentName = useAgentStore((s) => s.agentName) || "Mentor";

  return (
    <>
      <Dialog open={showModal} onOpenChange={(o) => !o && setShowModal(false)}>
        <DialogContent
          data-ocid="productivity.dialog"
          className="glass-card-strong border-border/40 text-foreground max-w-sm"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground text-base flex items-center gap-2">
              ⏱ Hourly Check-In
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {agentName} wants to know: how was the{" "}
            <span className="text-foreground font-semibold">
              {currentHour}:00 – {currentHour}:59
            </span>{" "}
            hour?
          </p>

          <div className="grid grid-cols-3 gap-3 mt-2">
            {STATUS_OPTIONS.map(({ label, icon: Icon, color, bg, ocid }) => (
              <motion.button
                type="button"
                key={label}
                data-ocid={ocid}
                onClick={() => handleSelect(label)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${bg}`}
              >
                <Icon className={`w-6 h-6 ${color}`} />
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
              </motion.button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowModal(false)}
            className="w-full text-muted-foreground text-xs mt-1"
          >
            Skip
          </Button>
        </DialogContent>
      </Dialog>

      {/* Hourly productivity bar */}
      <div
        style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30 }}
        className="h-1.5 flex gap-px bg-transparent pointer-events-none"
      >
        {hours24.map((h) => (
          <div
            key={h}
            className="flex-1 transition-colors duration-300"
            style={{ background: getHourColor(h) }}
            title={`${h}:00 - ${log[h] ?? "Not logged"}`}
          />
        ))}
      </div>
    </>
  );
}
