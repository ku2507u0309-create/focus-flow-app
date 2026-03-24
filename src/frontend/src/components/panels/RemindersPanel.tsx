import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Clock, Gift, Loader2, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Reminder } from "../../hooks/useQueries";
import { useAddReminder, useGetReminders } from "../../hooks/useQueries";

function formatDateTime(ts: bigint): string {
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  return d.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isUpcoming(ts: bigint): boolean {
  return Number(ts) / 1_000_000 > Date.now();
}

export default function RemindersPanel() {
  const { data: reminders = [], isLoading, refetch } = useGetReminders();
  const addReminder = useAddReminder();

  const [title, setTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [isBirthday, setIsBirthday] = useState(false);

  const triggeredRef = useRef<Set<string>>(new Set());

  // Check reminders every minute
  useEffect(() => {
    const check = () => {
      for (const r of reminders) {
        const key = r.id.toString();
        if (triggeredRef.current.has(key)) continue;
        const ms = Number(r.dateTime) / 1_000_000;
        if (ms <= Date.now()) {
          triggeredRef.current.add(key);
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification(`⏰ ${r.title}`, {
              body: r.isBirthday
                ? "🎂 Birthday reminder!"
                : "FocusFlow Reminder",
            });
          }
          toast(`⏰ ${r.title}`, {
            description: r.isBirthday ? "🎂 Birthday!" : "Reminder triggered",
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [reminders]);

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateTime) return;
    const ms = new Date(dateTime).getTime();
    if (Number.isNaN(ms)) {
      toast.error("Invalid date/time");
      return;
    }
    const tsNs = BigInt(ms) * BigInt(1_000_000);
    try {
      await addReminder.mutateAsync({
        title: title.trim(),
        dateTime: tsNs,
        isBirthday,
      });
      setTitle("");
      setDateTime("");
      setIsBirthday(false);
      toast.success("Reminder added");
      refetch();
    } catch {
      toast.error("Failed to add reminder");
    }
  };

  const sorted = [...reminders].sort(
    (a, b) => Number(a.dateTime) - Number(b.dateTime),
  );

  const upcoming = sorted.filter((r) => isUpcoming(r.dateTime));
  const past = sorted.filter((r) => !isUpcoming(r.dateTime));

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">Upcoming events</p>
        <div className="flex items-end justify-between">
          <h2 className="section-title">Reminders</h2>
          {upcoming.length > 0 && (
            <Badge
              variant="outline"
              className="border-primary/25 text-primary bg-primary/8 text-[11px] h-5"
            >
              {upcoming.length} upcoming
            </Badge>
          )}
        </div>
      </div>

      {/* Add form */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium">
          New Reminder
        </p>
        <form onSubmit={handleAdd} className="space-y-3">
          <Input
            data-ocid="reminder.input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Reminder title..."
            className="bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground h-9"
          />
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-muted/20 border border-border/40 text-sm text-foreground focus:outline-none focus:border-primary/50"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="birthday"
                checked={isBirthday}
                onCheckedChange={setIsBirthday}
              />
              <Label
                htmlFor="birthday"
                className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5 text-accent" />
                Birthday reminder
              </Label>
            </div>
            <Button
              data-ocid="reminder.add_button"
              type="submit"
              size="sm"
              disabled={!title.trim() || !dateTime || addReminder.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
            >
              {addReminder.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Reminder list */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && reminders.length === 0 && (
        <div
          className="glass-card p-8 text-center"
          data-ocid="reminder.empty_state"
        >
          <Bell className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            No reminders set. Add one above.
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Upcoming
          </p>
          <AnimatePresence>
            {upcoming.map((r, idx) => (
              <ReminderItem key={r.id.toString()} reminder={r} idx={idx} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Past
          </p>
          <AnimatePresence>
            {past.map((r, idx) => (
              <ReminderItem
                key={r.id.toString()}
                reminder={r}
                idx={idx}
                dimmed
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ReminderItem({
  reminder,
  idx,
  dimmed = false,
}: {
  reminder: Reminder;
  idx: number;
  dimmed?: boolean;
}) {
  return (
    <motion.div
      data-ocid={`reminder.item.${idx + 1}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ delay: idx * 0.05 }}
      className={`glass-card p-4 flex items-center gap-3 ${dimmed ? "opacity-50" : ""}`}
    >
      {reminder.isBirthday ? (
        <Gift className="w-4 h-4 text-accent shrink-0" />
      ) : (
        <Clock className="w-4 h-4 text-primary shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {reminder.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDateTime(reminder.dateTime)}
        </p>
      </div>
      {reminder.isBirthday && (
        <Badge
          variant="outline"
          className="text-xs border-accent/30 text-accent bg-accent/10 shrink-0"
        >
          🎂 Birthday
        </Badge>
      )}
    </motion.div>
  );
}
