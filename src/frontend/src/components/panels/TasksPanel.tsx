import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Edit2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { WeekTask } from "../../hooks/useQueries";
import {
  useAddTask,
  useDeleteTask,
  useGetTasks,
  useUpdateTask,
} from "../../hooks/useQueries";
import { saveDailyTaskCompletion, todayStr } from "../../utils/localStorage";
import { isAssistantEnabled, sendAssistantPrompt } from "../../utils/assistant";
import { useAgentStore } from "../../lib/agentStore";
import { useGamificationStore } from "../../lib/gamificationStore";

interface TasksProps {
  userId: string;
}

export default function TasksPanel({ userId }: TasksProps) {
  const { data: tasks = [], isLoading } = useGetTasks();
  const addTask = useAddTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { completeTask } = useGamificationStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [editTask, setEditTask] = useState<WeekTask | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const completedCount = tasks.filter((t) => t.isComplete).length;
  const totalCount = tasks.length;
  const completionPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Persist today's task completion % to localStorage so the graph can read it
  useEffect(() => {
    if (totalCount > 0) {
      saveDailyTaskCompletion(userId, todayStr(), completionPct);
    }
  }, [userId, completionPct, totalCount]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await addTask.mutateAsync({
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
      setShowDesc(false);
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    }
  };

  const handleToggle = async (task: WeekTask) => {
    if (task.id < 0n) return;
    try {
      await updateTask.mutateAsync({
        taskId: task.id,
        title: task.title,
        description: task.description,
        isComplete: !task.isComplete,
      });

      if (!task.isComplete) {
        // Award XP for completing a task
        completeTask();
        toast.success("+10 XP earned! 🎉", { duration: 2000 });
        // Trigger generic AI compliment locally for instant feedback
        const { speak } = useAgentStore.getState();
        const agentName = useAgentStore.getState().agentName || "Nova";
        speak(`${agentName} says: Amazing! "${task.title}" is done! +10 XP earned! 🎉`, "compliment", 5000);

        if (isAssistantEnabled()) {
          // Task was just completed
          void sendAssistantPrompt(
            userId,
            `I just completed the task titled "${task.title}". Please give me a quick encouragement and a suggestion for what I should do next to keep momentum going.`,
          )
            .then((msg) => {
              // Wait a bit before showing the detailed response (so compliment shows first)
              setTimeout(() => {
                speak(msg.text.slice(0, 150) + (msg.text.length > 150 ? "..." : ""), "general", 6000);
              }, 4000);
            })
            .catch(() => {
              // ignore assistant failures
            });
        }
      }
    } catch {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (taskId: bigint) => {
    if (taskId < 0n) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const openEdit = (task: WeekTask) => {
    if (task.id < 0n) return;
    setEditTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description);
  };

  const handleEditSave = async () => {
    if (!editTask || !editTitle.trim()) return;
    try {
      await updateTask.mutateAsync({
        taskId: editTask.id,
        title: editTitle.trim(),
        description: editDesc.trim(),
        isComplete: editTask.isComplete,
      });
      setEditTask(null);
      toast.success("Task updated");
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Progress header */}
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">This week</p>
        <div className="flex items-end justify-between mb-3">
          <h2 className="section-title">Weekly Tasks</h2>
          <span className="text-2xl font-bold tabular-nums text-primary leading-none">
            {completionPct}%
          </span>
        </div>
        <Progress
          value={completionPct}
          data-ocid="tasks.progress_bar"
          className="h-1.5 bg-muted/25"
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {completedCount} of {totalCount} tasks complete
          </span>
          <Badge
            variant="outline"
            className="border-primary/25 text-primary bg-primary/8 text-[11px] h-5"
          >
            {totalCount - completedCount} remaining
          </Badge>
        </div>
      </div>

      {/* Add task form */}
      <div className="glass-card p-4">
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <Input
              data-ocid="tasks.input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a new task..."
              className="flex-1 bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDesc((p) => !p)}
              className="text-muted-foreground h-9 px-2"
              title={showDesc ? "Hide description" : "Add description"}
            >
              {showDesc ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              data-ocid="tasks.add_button"
              type="submit"
              size="sm"
              disabled={!title.trim() || addTask.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
            >
              {addTask.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>

          <AnimatePresence>
            {showDesc && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="bg-muted/20 border-border/40 text-foreground placeholder:text-muted-foreground resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {isLoading && (
          <div
            data-ocid="tasks.loading_state"
            className="flex justify-center py-8"
          >
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && tasks.length === 0 && (
          <div
            data-ocid="tasks.empty_state"
            className="glass-card p-8 text-center"
          >
            <CheckCircle2 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No tasks yet. Add your first task above.
            </p>
          </div>
        )}

        <AnimatePresence>
          {tasks.map((task, idx) => (
            <motion.div
              key={task.id.toString()}
              data-ocid={`tasks.item.${idx + 1}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ delay: idx * 0.04 }}
              className={`glass-card p-3.5 flex items-start gap-3 group transition-colors cursor-default hover:border-primary/15 ${
                task.isComplete ? "opacity-50" : ""
              }`}
            >
              <button
                type="button"
                data-ocid={`tasks.checkbox.${idx + 1}`}
                onClick={() => handleToggle(task)}
                className="mt-0.5 shrink-0 transition-colors"
                aria-label={
                  task.isComplete ? "Mark incomplete" : "Mark complete"
                }
              >
                {task.isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium text-foreground ${
                    task.isComplete ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {task.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  type="button"
                  data-ocid={`tasks.edit_button.${idx + 1}`}
                  onClick={() => openEdit(task)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  aria-label="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-ocid={`tasks.delete_button.${idx + 1}`}
                  onClick={() => handleDelete(task.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Edit dialog */}
      <Dialog
        open={!!editTask}
        onOpenChange={(open) => !open && setEditTask(null)}
      >
        <DialogContent
          data-ocid="tasks.dialog"
          className="glass-card-strong border-border/40 text-foreground"
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Task title"
              className="bg-muted/20 border-border/40 text-foreground"
            />
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="bg-muted/20 border-border/40 text-foreground resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                data-ocid="tasks.cancel_button"
                variant="ghost"
                onClick={() => setEditTask(null)}
                className="text-muted-foreground"
              >
                Cancel
              </Button>
              <Button
                data-ocid="tasks.save_button"
                onClick={handleEditSave}
                disabled={!editTitle.trim() || updateTask.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateTask.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
