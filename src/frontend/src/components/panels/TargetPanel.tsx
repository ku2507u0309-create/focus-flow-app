import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Edit2, Flag, Loader2, Target, TrendingUp, Plus, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetTargets, useAddTarget, useUpdateTarget, useDeleteTarget } from "../../hooks/useQueries";

export default function TargetPanel() {
  const { data: targets = [], isLoading } = useGetTargets();
  const addTarget = useAddTarget();
  const updateTarget = useUpdateTarget();
  const deleteTarget = useDeleteTarget();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [titleVal, setTitleVal] = useState("");
  const [currentVal, setCurrentVal] = useState("");
  const [goalVal, setGoalVal] = useState("");

  const resetForm = () => {
    setTitleVal("");
    setCurrentVal("0");
    setGoalVal("100");
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setTitleVal(t.title);
    setCurrentVal(t.currentValue.toString());
    setGoalVal(t.goalValue.toString());
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const curr = Number(currentVal);
    const goal = Number(goalVal);
    const title = titleVal.trim();

    if (!title || Number.isNaN(curr) || Number.isNaN(goal) || goal <= 0) {
      toast.error("Valid title and numbers required");
      return;
    }

    const payload = editingId 
      ? { id: editingId, title, currentValue: curr, goalValue: goal }
      : { title, currentValue: curr, goalValue: goal };
    
    console.log("Submitting Target Payload:", payload);

    try {
      if (editingId) {
        await updateTarget.mutateAsync(payload as any);
        toast.success("Target updated successfully");
      } else {
        await addTarget.mutateAsync(payload as any);
        toast.success("New target added successfully");
      }
      resetForm();
    } catch (err: any) {
      console.error("Target Save Error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to save target";
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this target?")) {
      try {
        await deleteTarget.mutateAsync(id);
        toast.success("Target removed");
      } catch {
        toast.error("Failed to delete");
      }
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between glass-card-strong p-5">
        <div>
          <p className="section-overline mb-1">Execution phase</p>
          <h2 className="section-title">Objective Tracking</h2>
        </div>
        <Button onClick={() => setIsAdding(true)} className="btn-premium rounded-full px-6">
          <Plus className="w-4 h-4 mr-2" /> Add Target
        </Button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card p-6 border-primary/20">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-lg uppercase tracking-tight">{editingId ? "Modify Target" : "New Objective"}</h3>
               <button onClick={resetForm} className="text-muted-foreground hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
               <div>
                  <Label className="text-xs text-muted-foreground uppercase font-black tracking-widest">Goal Title</Label>
                  <Input value={titleVal} onChange={e => setTitleVal(e.target.value)} placeholder="e.g. Master React Engine" className="premium-input mt-1 text-foreground" />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase font-black tracking-widest">Starting / Current</Label>
                    <Input type="number" value={currentVal} onChange={e => setCurrentVal(e.target.value)} className="premium-input mt-1 text-foreground" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase font-black tracking-widest">End Goal</Label>
                    <Input type="number" value={goalVal} onChange={e => setGoalVal(e.target.value)} className="premium-input mt-1 text-foreground" />
                  </div>
               </div>
               <Button type="submit" disabled={addTarget.isPending || updateTarget.isPending} className="w-full btn-premium py-6 font-black text-base uppercase">
                 {editingId ? "Update Protocol" : "Authorize Target"}
               </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-1 gap-4">
        {targets.map(t => {
          const pct = Math.min(100, Math.round((Number(t.currentValue) / Number(t.goalValue)) * 100));
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 relative group overflow-hidden border-white/5">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-foreground tracking-tight uppercase italic">{t.title}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{t.currentValue.toString()} / {t.goalValue.toString()} UNITS</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleEdit(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              <div className="mt-8 space-y-2 relative z-10">
                <div className="flex justify-between items-end">
                   <span className="text-xs font-black text-primary/60 tracking-widest">{pct}% OPTIMIZED</span>
                   {pct >= 100 && <span className="text-[10px] bg-primary text-black px-2 py-0.5 rounded font-black">COMPLETED</span>}
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                </div>
              </div>
            </motion.div>
          );
        })}

        {targets.length === 0 && !isAdding && (
          <div className="text-center py-20 bg-white/[0.02] rounded-3xl border border-dashed border-white/10">
            <Target className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">No active targets in protocol</p>
          </div>
        )}
      </div>
    </div>
  );
}
