import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Settings, Sun, LogOut, Bot, Zap, Flame, Star, RotateCcw } from "lucide-react";
import { useAgentStore } from "../../lib/agentStore";
import { useGamificationStore } from "../../lib/gamificationStore";

interface ProfileMenuProps {
  username: string;
  onLogout: () => void;
  onOpenSettings: () => void;
}

const LEVEL_NAMES = ["Starter", "Focused", "Productive", "Champion", "Legend"];

export default function ProfileMenu({ username, onLogout, onOpenSettings }: ProfileMenuProps) {
  const { theme, setTheme } = useTheme();
  const { agentName, roleModel, resetMentor } = useAgentStore();
  const { xp, level, streakDays, tasksCompleted } = useGamificationStore();

  const initials = username
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const levelName = LEVEL_NAMES[Math.min((level - 1), LEVEL_NAMES.length - 1)];
  const xpInLevel = xp % 100;
  const xpToNextLevel = 100;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-secondary transition-colors group"
          aria-label="Profile menu"
        >
          {/* Streak badge */}
          {streakDays > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-orange-400 hidden sm:flex">
              <Flame className="w-3.5 h-3.5" />
              {streakDays}
            </span>
          )}
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 border-2 border-primary/30 flex items-center justify-center ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
            <span className="text-[11px] font-black text-foreground">{initials}</span>
          </div>
          <span className="text-sm font-medium text-foreground hidden md:block truncate max-w-[100px]">
            {username}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2 glass-card-strong border-border/40">
        {/* User header */}
        <DropdownMenuLabel className="px-2 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-foreground">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">{username}</p>
              <p className="text-xs text-muted-foreground">
                <Star className="w-3 h-3 inline mr-0.5" />
                Level {level} · {levelName}
              </p>
            </div>
          </div>

          {/* XP Bar */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-primary" />{xp} XP total
              </span>
              <span>{xpInLevel}/{xpToNextLevel} to next level</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full premium-gradient-bg rounded-full transition-all duration-700"
                style={{ width: `${(xpInLevel / xpToNextLevel) * 100}%` }}
              />
            </div>
          </div>
        </DropdownMenuLabel>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-1.5 px-1 mb-2">
          <div className="bg-muted/20 rounded-lg p-2 text-center">
            <p className="text-[11px] font-black text-orange-400 flex items-center justify-center gap-0.5">
              <Flame className="w-3 h-3" />{streakDays}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Streak</p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2 text-center">
            <p className="text-[11px] font-black text-primary">{tasksCompleted}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Tasks</p>
          </div>
          <div className="bg-muted/20 rounded-lg p-2 text-center">
            <p className="text-[11px] font-black text-accent">{level}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Level</p>
          </div>
        </div>

        {/* Agent name */}
        {agentName && (
          <>
            <DropdownMenuSeparator className="bg-border/20" />
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                <span className="text-xs text-foreground font-semibold truncate">
                  {agentName}
                </span>
              </div>
              <button 
                onClick={(e) => { 
                  e.preventDefault(); 
                  const newName = prompt("New Agent Name:", agentName); 
                  if (newName) useAgentStore.getState().setFullContext({ agentName: newName }); 
                }}
                className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                title="Edit Agent Name"
              >
                <Settings className="w-3 h-3" />
              </button>
            </div>
          </>
        )}

        <DropdownMenuSeparator className="bg-border/20" />

        <DropdownMenuItem onClick={onOpenSettings} className="gap-2 rounded-lg cursor-pointer">
          <Settings className="w-4 h-4" />
          <span>Settings & Customize</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="gap-2 rounded-lg cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          <span>Switch to {theme === "dark" ? "Light" : "Dark"} mode</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/20" />

        <DropdownMenuItem
          onClick={() => { if (confirm("Reset your mentor? This will restart the 9-step onboarding.")) resetMentor(); }}
          className="gap-2 rounded-lg cursor-pointer text-orange-500 focus:text-orange-500 focus:bg-orange-500/10"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Mentor</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={onLogout}
          className="gap-2 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
