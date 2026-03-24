import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Check, Clock, Trash2, Sparkles, Play } from "lucide-react";
import { useAgentStore } from "../../lib/agentStore";
import { useSaveAssistantMessage } from "../../hooks/useQueries";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { saveDailyScheduleCompletion, todayStr } from "../../utils/localStorage";
import { useEffect } from "react";

export default function DailySchedulePanel() {
  const { dailyTasks = [], addDailyTask, toggleDailyTask, removeDailyTask, speak, agentName } = useAgentStore();
  const { mutateAsync: saveMessage } = useSaveAssistantMessage();

  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");

  const completedCount = dailyTasks.filter(t => t.completed).length;
  const progress = dailyTasks.length === 0 ? 0 : Math.round((completedCount / dailyTasks.length) * 100);

  useEffect(() => {
    if (dailyTasks.length > 0) {
      const userId = localStorage.getItem("username") || "user";
      saveDailyScheduleCompletion(userId, todayStr(), progress);
    }
  }, [progress, dailyTasks.length]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please provide a task name.");
      return;
    }
    addDailyTask(time || "--:--", title);
    setTitle("");
    setTime("");
  };

  const handleToggle = async (id: string, checked: boolean) => {
    toggleDailyTask(id, checked);
    if (checked) {
      const msg = "Good job. What's next?";
      speak(msg, "compliment", 6000);
      try {
        await saveMessage({ role: "assistant", text: msg });
      } catch (e) {
        console.error("Failed to save assistant message", e);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card-strong p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="section-title">Today's Schedule</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your manual daily plan. No pressure, just progress.
            </p>
          </div>
          <div className="shrink-0 text-center bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
            <p className="text-2xl font-black text-primary">{progress}%</p>
            <p className="text-[10px] text-primary/70 uppercase tracking-wider">done</p>
          </div>
        </div>

        <Progress value={progress} className="h-2 bg-muted/30 w-full mb-6" />

        <form onSubmit={handleAdd} className="flex items-center gap-2 mb-6">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="premium-input text-sm w-32 shrink-0 py-2.5"
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task name..."
            className="premium-input text-sm flex-1 py-2.5"
            required
          />
          <button
            type="submit"
            className="btn-premium py-2.5 px-4 text-sm flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </form>

        <div className="space-y-2">
          <AnimatePresence>
            {dailyTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8 text-muted-foreground text-sm empty-state"
              >
                No tasks yet. Want to plan your day?
              </motion.div>
            ) : (
              dailyTasks
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`glass-card px-4 py-3 flex items-center gap-4 transition-all ${
                      task.completed ? "opacity-50" : "hover:border-primary/30"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(task.id, !task.completed)}
                      className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all shrink-0 ${
                        task.completed
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground/30 hover:border-primary/50 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                    </button>

                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground/60" />
                        <span className="text-xs font-bold text-muted-foreground/80 tabular-nums">
                          {task.time}
                        </span>
                      </div>
                      <p
                        className={`text-sm font-semibold mt-0.5 truncate ${
                          task.completed ? "line-through text-muted-foreground/60" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("open-focus-lock"))}
                      className="text-primary/70 hover:text-primary p-2 rounded-lg hover:bg-primary/10 transition-colors shrink-0"
                      title="Start Focus Timer"
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeDailyTask(task.id)}
                      className="text-muted-foreground/40 hover:text-destructive p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
