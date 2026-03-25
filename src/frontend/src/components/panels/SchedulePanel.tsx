import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useAddScheduleItem,
  useGetScheduleTemplate,
  useScheduleLocalOverrides,
} from "../../hooks/useQueries";
import {
  formatDateStr,
  getDailyLog,
  saveDailyTaskCompletion,
  setDailyLogItem,
  todayStr,
} from "../../utils/localStorage";

const API_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000/api";

interface ScheduleProps {
  userId: string;
}

function formatDuration(hours: bigint | number): string {
  const h = typeof hours === "bigint" ? Number(hours) : hours;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h === 1) return "1h";
  return `${h}h`;
}

interface EditState {
  itemId: string;
  title: string;
  duration: string;
  time: string;
}

export default function SchedulePanel({ userId }: ScheduleProps) {
  const { data: rawItems = [], isLoading } = useGetScheduleTemplate();
  const addItem = useAddScheduleItem();
  const overrides = useScheduleLocalOverrides(userId);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState("1");
  const [newItemTime, setNewItemTime] = useState("");
  const [logState, setLogState] = useState<Record<string, boolean>>({});
  const [initialized, setInitialized] = useState<string>("");
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [order, setOrderState] = useState<string[]>([]);

  const token = localStorage.getItem("authToken");
  const dateStr = formatDateStr(selectedDate);

  // Load log for selected date (only once per date)
  if (dateStr !== initialized) {
    const existing = getDailyLog(userId, dateStr);
    setLogState(existing);
    setInitialized(dateStr);
  }

  // Load deleted/order from localStorage on mount & when userId changes
  const { getDeleted, getOrder } = overrides;
  useEffect(() => {
    setDeletedIds(getDeleted());
    setOrderState(getOrder());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Filter out deleted items and apply local edits
  const items = rawItems
    .filter((i) => !deletedIds.includes(i.id.toString()))
    .map((i) => {
      const edits = overrides.getEdits();
      const edit = edits[i.id.toString()];
      if (edit) {
        return {
          ...i,
          title: edit.title ?? i.title,
          duration:
            edit.duration !== undefined
              ? BigInt(Math.round(Number.parseFloat(edit.duration)))
              : i.duration,
        };
      }
      return i;
    });

  // Sort by saved order
  const sortedItems = [...items].sort((a, b) => {
    const aIdx = order.indexOf(a.id.toString());
    const bIdx = order.indexOf(b.id.toString());
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  const handleToggle = async (itemId: string, checked: boolean) => {
    setDailyLogItem(userId, dateStr, itemId, checked);
    const newLog = { ...logState, [itemId]: checked };
    setLogState(newLog);

    // Persist completion % for today so the graph reflects daily schedule progress
    if (dateStr === todayStr() && sortedItems.length > 0) {
      const doneCount = sortedItems.filter((i) =>
        i.id.toString() === itemId ? checked : !!newLog[i.id.toString()],
      ).length;
      const pct = Math.round((doneCount / sortedItems.length) * 100);
      saveDailyTaskCompletion(userId, dateStr, pct);
    }

    // Track activity via Python backend API
    if (token) {
      fetch(
        `${API_URL}/track-action?kind=daily_log_item&payload=${encodeURIComponent(`${itemId}:${checked}`)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      ).catch(() => {
        // ignore failures
      });
    }
  };

  const completedCount = sortedItems.filter(
    (i) => logState[i.id.toString()],
  ).length;
  const completionPct =
    sortedItems.length > 0
      ? Math.round((completedCount / sortedItems.length) * 100)
      : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const dur = Number.parseFloat(durationHours);
    if (Number.isNaN(dur) || dur <= 0) {
      toast.error("Enter a valid duration");
      return;
    }
    try {
      const newId = await addItem.mutateAsync({
        title: title.trim(),
        duration: BigInt(Math.round(dur)),
      });
      // If user set a time for this item, save it
      if (newItemTime && newId !== undefined) {
        overrides.setItemTime(newId.toString(), newItemTime);
      }
      setTitle("");
      setDurationHours("1");
      setNewItemTime("");
      toast.success("Schedule item added");
    } catch {
      toast.error("Failed to add item");
    }
  };

  const changeDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
  };

  const isToday = formatDateStr(selectedDate) === todayStr();

  // ── Edit handlers ──
  const startEdit = (
    itemId: string,
    currentTitle: string,
    currentDuration: bigint,
  ) => {
    const currentTime = overrides.getItemTime(itemId);
    setEditState({
      itemId,
      title: currentTitle,
      duration: Number(currentDuration).toString(),
      time: currentTime,
    });
  };

  const cancelEdit = () => setEditState(null);

  const saveEdit = () => {
    if (!editState) return;
    if (!editState.title.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    const dur = Number.parseFloat(editState.duration);
    if (Number.isNaN(dur) || dur <= 0) {
      toast.error("Enter a valid duration");
      return;
    }
    overrides.saveEdit(editState.itemId, {
      title: editState.title.trim(),
      duration: editState.duration,
    });
    if (editState.time) {
      overrides.setItemTime(editState.itemId, editState.time);
    } else {
      overrides.setItemTime(editState.itemId, "");
    }
    toast.success("Item updated");
    setEditState(null);
  };

  // ── Delete handler ──
  const handleDelete = (itemId: string) => {
    overrides.markDeleted(itemId);
    setDeletedIds((prev) => [...prev, itemId]);
    toast.success("Item removed");
  };

  // ── Reorder handlers ──
  const getCurrentOrder = (): string[] => {
    // Use current sorted order as baseline
    return sortedItems.map((i) => i.id.toString());
  };

  const moveItem = (itemId: string, direction: "up" | "down") => {
    const currentOrder = getCurrentOrder();
    const idx = currentOrder.indexOf(itemId);
    if (idx === -1) return;
    const newOrder = [...currentOrder];
    if (direction === "up" && idx > 0) {
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    } else if (direction === "down" && idx < newOrder.length - 1) {
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    }
    overrides.setOrder(newOrder);
    setOrderState(newOrder);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Date selector + completion */}
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">Routine template</p>
        <div className="flex items-end justify-between mb-4">
          <h2 className="section-title">Daily Schedule</h2>
          <span className="text-2xl font-bold tabular-nums text-primary leading-none">
            {completionPct}%
          </span>
        </div>

        {/* Date picker row */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => changeDate(-1)}
            data-ocid="schedule.pagination_prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold text-foreground">
              {isToday
                ? "Today"
                : selectedDate.toLocaleDateString("en", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
            </p>
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => changeDate(1)}
            data-ocid="schedule.pagination_next"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Progress value={completionPct} className="h-1.5 bg-muted/25" />
        <p className="text-xs text-muted-foreground mt-1.5">
          {completedCount} of {sortedItems.length} items done today
        </p>
      </div>

      {/* Add item form */}
      <div className="glass-card p-4">
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          Add to template (repeats daily)
        </p>
        <form onSubmit={handleAdd} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Activity name..."
              className="flex-1 bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground h-9"
              data-ocid="schedule.input"
            />
            <Input
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              placeholder="hrs"
              className="w-16 bg-muted/20 border-border/40 text-foreground h-9 text-center"
            />
            <Input
              value={newItemTime}
              onChange={(e) => setNewItemTime(e.target.value)}
              type="time"
              placeholder="Time"
              className="w-28 bg-muted/20 border-border/40 text-foreground h-9"
              title="Optional start time"
            />
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || addItem.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
              data-ocid="schedule.primary_button"
            >
              {addItem.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            Duration in hours · Time is optional (e.g., 09:00)
          </p>
        </form>
      </div>

      {/* Schedule items */}
      <div className="space-y-2">
        {isLoading && (
          <div
            className="flex justify-center py-8"
            data-ocid="schedule.loading_state"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && sortedItems.length === 0 && (
          <div
            className="glass-card p-8 text-center"
            data-ocid="schedule.empty_state"
          >
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No schedule items. Add your daily routine above.
            </p>
          </div>
        )}

        <AnimatePresence>
          {sortedItems.map((item, idx) => {
            const itemKey = item.id.toString();
            const done = !!logState[itemKey];
            const isEditing = editState?.itemId === itemKey;
            const itemTime = overrides.getItemTime(itemKey);
            const ocidIndex = idx + 1;

            return (
              <motion.div
                key={itemKey}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: idx * 0.03 }}
                data-ocid={`schedule.item.${ocidIndex}`}
                className={`glass-card transition-all ${done && !isEditing ? "opacity-60" : ""}`}
              >
                {isEditing ? (
                  /* ── Edit row ── */
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-primary/70 uppercase tracking-wider">
                      Edit item
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={editState.title}
                        onChange={(e) =>
                          setEditState((s) =>
                            s ? { ...s, title: e.target.value } : s,
                          )
                        }
                        placeholder="Title"
                        className="flex-1 bg-muted/20 border-border/40 text-foreground h-8 text-sm"
                        autoFocus
                        data-ocid="schedule.input"
                      />
                      <Input
                        value={editState.duration}
                        onChange={(e) =>
                          setEditState((s) =>
                            s ? { ...s, duration: e.target.value } : s,
                          )
                        }
                        type="number"
                        min="0.5"
                        max="24"
                        step="0.5"
                        placeholder="hrs"
                        className="w-16 bg-muted/20 border-border/40 text-foreground h-8 text-center text-sm"
                      />
                      <Input
                        value={editState.time}
                        onChange={(e) =>
                          setEditState((s) =>
                            s ? { ...s, time: e.target.value } : s,
                          )
                        }
                        type="time"
                        className="w-28 bg-muted/20 border-border/40 text-foreground h-8 text-sm"
                        title="Start time (optional)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs gap-1"
                        data-ocid="schedule.save_button"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
                        data-ocid="schedule.cancel_button"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* ── Normal row ── */
                  <div className="p-4 flex items-center gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        data-ocid="schedule.drag_handle"
                        onClick={() => moveItem(itemKey, "up")}
                        disabled={idx === 0}
                        className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        data-ocid="schedule.drag_handle"
                        onClick={() => moveItem(itemKey, "down")}
                        disabled={idx === sortedItems.length - 1}
                        className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Move down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={(e) => handleToggle(itemKey, e.target.checked)}
                      className="w-4 h-4 rounded border-border/40 bg-muted/20 accent-primary cursor-pointer shrink-0"
                      data-ocid={`schedule.checkbox.${ocidIndex}`}
                    />

                    {/* Title + time */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium text-foreground ${
                          done ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {item.title}
                      </p>
                      {itemTime && (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                          {itemTime}
                        </p>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {itemTime && (
                        <Badge
                          variant="outline"
                          className="border-accent/20 text-accent/80 bg-accent/8 text-[10px] px-1.5 py-0"
                        >
                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                          {itemTime}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="border-primary/20 text-primary bg-primary/8 text-xs shrink-0"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDuration(item.duration)}
                      </Badge>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-ocid={`schedule.edit_button.${ocidIndex}`}
                        onClick={() =>
                          startEdit(itemKey, item.title, item.duration)
                        }
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit item"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        data-ocid={`schedule.delete_button.${ocidIndex}`}
                        onClick={() => handleDelete(itemKey)}
                        className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
