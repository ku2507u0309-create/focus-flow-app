import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useSaveCallerUserProfile } from "../../hooks/useQueries";

export default function ProfileSetup() {
  const [username, setUsername] = useState("");
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    try {
      await saveProfile.mutateAsync({ username: username.trim(), email: "" });
      toast.success("Profile created! Welcome to FocusFlow.");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="glass-card-strong p-8 w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Almost there!</h2>
            <p className="text-xs text-muted-foreground">Set up your profile</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Choose a display name for your FocusFlow workspace. This is how you'll
          be identified across the app.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm text-foreground">
              <User className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
              Display Name
            </Label>
            <Input
              id="username"
              data-ocid="auth.login_input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alex Johnson"
              className="bg-muted/30 border-border/50 text-foreground placeholder:text-muted-foreground"
              autoFocus
              maxLength={50}
            />
          </div>

          <Button
            type="submit"
            disabled={!username.trim() || saveProfile.isPending}
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            {saveProfile.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {saveProfile.isPending ? "Saving..." : "Enter FocusFlow →"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
