import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useGetScheduleTemplate } from "../../hooks/useQueries";
import {
  formatDateStr,
  getDailyLog,
  getJournalEntry,
  getProductivityLog,
  todayStr,
} from "../../utils/localStorage";

interface CalendarProps {
  userId: string;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function completionColor(pct: number): string {
  if (pct === 0) return "transparent";
  if (pct < 33) return "oklch(0.60 0.22 28)"; // red
  if (pct < 67) return "oklch(0.78 0.18 80)"; // yellow
  return "oklch(0.65 0.15 145)"; // green
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function CalendarPanel({ userId }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  const { data: scheduleItems = [] } = useGetScheduleTemplate();

  const changeMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 11) {
      m = 0;
      y++;
    }
    if (m < 0) {
      m = 11;
      y--;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  // biome-ignore lint/correctness/useExhaustiveDependencies: getDailyLog is a pure localStorage utility
  const daysData = useMemo(() => {
    const result: Array<{ dateStr: string; pct: number }> = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dateStr = formatDateStr(date);
      const dailyLog = getDailyLog(userId, dateStr);
      const done = Object.values(dailyLog).filter(Boolean).length;
      const total = scheduleItems.length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      result.push({ dateStr, pct });
    }
    return result;
  }, [viewYear, viewMonth, userId, scheduleItems]);

  // Build selected day detail
  const selectedDetail = useMemo(() => {
    if (!selected) return null;
    const dailyLog = getDailyLog(userId, selected);
    const prodLog = getProductivityLog(userId, selected);
    const journal = getJournalEntry(userId, selected);

    const productive = Object.values(prodLog).filter(
      (s) => s === "Productive",
    ).length;
    const neutral = Object.values(prodLog).filter(
      (s) => s === "Neutral",
    ).length;
    const wasted = Object.values(prodLog).filter((s) => s === "Wasted").length;

    const itemsWithStatus = scheduleItems.map((item) => ({
      title: item.title,
      done: !!dailyLog[item.id.toString()],
    }));

    return { itemsWithStatus, productive, neutral, wasted, journal };
  }, [selected, userId, scheduleItems]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">Monthly view</p>
        <h2 className="section-title mb-3">Progress Calendar</h2>

        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-base font-bold text-foreground">
            {MONTHS[viewMonth]} {viewYear}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="glass-card p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-center text-xs text-muted-foreground font-medium py-1"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for first day */}
          {Array.from({ length: firstDay }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder cells
            <div key={`empty-${i}`} />
          ))}

          {daysData.map(({ dateStr, pct }, i) => {
            const day = i + 1;
            const isToday = dateStr === todayStr();
            const isSelected = selected === dateStr;
            const color = completionColor(pct);

            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`cal-day ${isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              >
                <span
                  className={`text-xs font-medium ${
                    isToday
                      ? "text-primary"
                      : isSelected
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  {day}
                </span>
                {pct > 0 && (
                  <div
                    className="w-2 h-2 rounded-full mt-0.5"
                    style={{ background: color }}
                    title={`${pct}% complete`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-border/30">
          {[
            { label: "Low", color: "oklch(0.60 0.22 28)" },
            { label: "Mid", color: "oklch(0.78 0.18 80)" },
            { label: "High", color: "oklch(0.65 0.15 145)" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: color }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day detail panel */}
      <AnimatePresence>
        {selected && selectedDetail && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="glass-card-strong p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                {new Date(`${selected}T00:00:00`).toLocaleDateString("en", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Schedule items */}
            {selectedDetail.itemsWithStatus.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                  Schedule
                </p>
                <div className="space-y-1.5">
                  {selectedDetail.itemsWithStatus.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          item.done ? "bg-success" : "bg-muted-foreground/30"
                        }`}
                      />
                      <span
                        className={`${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                      >
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Productivity */}
            {selectedDetail.productive +
              selectedDetail.neutral +
              selectedDetail.wasted >
              0 && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                  Hourly Productivity
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-success">
                    ✓ {selectedDetail.productive} productive
                  </span>
                  <span className="text-warning">
                    ~ {selectedDetail.neutral} neutral
                  </span>
                  <span className="text-destructive">
                    ✗ {selectedDetail.wasted} wasted
                  </span>
                </div>
              </div>
            )}

            {/* Journal */}
            {selectedDetail.journal && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">
                  Journal
                </p>
                <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                  {selectedDetail.journal}
                </p>
              </div>
            )}

            {!selectedDetail.journal &&
              selectedDetail.itemsWithStatus.length === 0 &&
              selectedDetail.productive +
                selectedDetail.neutral +
                selectedDetail.wasted ===
                0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No activity recorded for this day.
                </p>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
