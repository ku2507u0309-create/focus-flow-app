import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { 
  BarChart2, Bell, BookOpen, Brain, CalendarDays, CheckSquare, Clock, Flame, Home, Menu, 
  MessageSquare, Music, Palette, Star, Target, Zap, MoreHorizontal, PlusCircle, Loader2 
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, useRef } from "react";
import { useAgentStore } from "../../lib/agentStore";
import { useGamificationStore } from "../../lib/gamificationStore";
import { getDailyQuote } from "../../utils/quotes";
import AssistantPanel from "./AssistantPanel";
import BackgroundPanel from "./BackgroundPanel";
import CalendarPanel from "./CalendarPanel";
import GraphPanel from "./GraphPanel";
import HomePage from "./HomePage";
import HourlyCheck from "./HourlyCheck";
import JournalPanel from "./JournalPanel";
import RemindersPanel from "./RemindersPanel";
import SchedulePanel from "./SchedulePanel";
import TargetPanel from "./TargetPanel";
import TasksPanel from "./TasksPanel";
import ProfileMenu from "../ui/ProfileMenu";
import FocusLockMode from "../ui/FocusLockMode";
import MusicPlayerPanel from "../ui/MusicPlayer";
import HookBanner from "../ui/HookBanner";
import DailySchedulePanel from "../ui/DailySchedulePanel";
import AlarmPanel from "../ui/AlarmPanel";

export type Section =
  | "home" | "tasks" | "schedule" | "journal" | "reminders"
  | "target" | "graph" | "calendar" | "assistant" | "background"
  | "music" | "focus" | "alarm" | "mentor-schedule" | "ai-agent" | "more";

const NAV_ITEMS: Array<{ id: Section; label: string; Icon: React.ElementType; group?: string }> = [
  { id: "home",            label: "Home",           Icon: Home,         group: "main" },
  { id: "tasks",           label: "Tasks",          Icon: CheckSquare,  group: "main" },
  { id: "ai-agent",        label: "AI Agent",       Icon: Brain,        group: "main" },
  { id: "schedule",        label: "Routine",        Icon: Clock,        group: "main" },
  { id: "target",          label: "Target",         Icon: Target,       group: "main" },
  { id: "more",            label: "More",           Icon: MoreHorizontal,group: "main" },
  
  { id: "graph",           label: "Insights",       Icon: BarChart2,    group: "secondary" },
  { id: "calendar",        label: "Calendar",       Icon: CalendarDays, group: "secondary" },
  { id: "reminders",       label: "Reminders",      Icon: Bell,         group: "secondary" },
  { id: "journal",         label: "Journal",        Icon: BookOpen,     group: "secondary" },
  { id: "background",      label: "Theme",          Icon: Palette,      group: "settings" },
];

const NAV_GROUPS = [
  { key: "work",     label: "Work" },
  { key: "reflect",  label: "Reflect" },
  { key: "insights", label: "Insights" },
  { key: "settings", label: "Settings" },
];

interface DashboardProps { onLogout: () => void; username: string; }

export default function Dashboard({ onLogout, username }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<Section>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusLockActive, setFocusLockActive] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const quote = getDailyQuote();
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreMenuOpen]);

  const userId = username ?? "anonymous";
  const displayName = username ?? "User";

  const { speak, agentName } = useAgentStore();
  const { streakDays, xp, level, checkStreak } = useGamificationStore();

  const agentDisplayName = agentName || "Nova";
  const xpInLevel = xp % 100;

  useEffect(() => {
    checkStreak();
    const name = useAgentStore.getState().agentName || "Nova";
    if (streakDays > 1) {
      speak(`🔥 ${streakDays}-day streak! ${name} is proud of you.`, "greeting", 5000);
    } else {
      speak(`Hey ${displayName}! ${name} here. Let's make today count! ✨`, "greeting", 4000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  // Tab-switch detection during focus
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && focusLockActive) {
        const s = useAgentStore.getState();
        s.speak("You switched tabs. Get back — this is where your focus belongs.", "pressure", 6000);
      }
    };
    const onOpenFocusLock = () => setFocusLockActive(true);
    const onNavigateToAI = () => navTo("ai-agent");
    window.addEventListener("open-focus-lock", onOpenFocusLock);
    window.addEventListener("navigate-to-ai-agent", onNavigateToAI);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("open-focus-lock", onOpenFocusLock);
      window.removeEventListener("navigate-to-ai-agent", onNavigateToAI);
    }
  }, [focusLockActive]);

  const handleLogout = () => { queryClient.clear(); onLogout(); };
  const navTo = (section: Section) => { setActiveSection(section); setSidebarOpen(false); };

  const initials = displayName.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center glow-primary shrink-0">
          <Zap className="w-4 h-4 text-primary" strokeWidth={2.5} />
        </div>
        <div>
          <span className="text-[15px] font-black tracking-tight premium-gradient-text">FocusFlow</span>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Productivity HQ</p>
        </div>
      </div>

      {/* Streak + XP */}
      <div className="mx-3 mb-2 shrink-0 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/15 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-bold text-orange-400">{streakDays}d streak</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">Lv.{level}</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <motion.div className="h-full premium-gradient-bg rounded-full" initial={{ width: 0 }} animate={{ width: `${xpInLevel}%` }} transition={{ duration: 1, ease: "easeOut" }} />
        </div>
        <p className="text-[10px] text-muted-foreground/60">{xpInLevel}/100 XP</p>
      </div>

      {/* Quote */}
      <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-secondary/40 border border-border/20 shrink-0">
        <p className="text-[10px] text-muted-foreground/70 italic leading-relaxed line-clamp-2">&ldquo;{quote}&rdquo;</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto space-y-4 min-h-0">
        <div className="space-y-0.5">
          {NAV_ITEMS.filter(i => i.group === 'main').map(({ id, label, Icon }) => (
            <button key={id} onClick={() => navTo(id)} className={`nav-item w-full text-left relative ${activeSection === id ? "active" : ""}`}>
              <Icon className={`w-4 h-4 shrink-0 ${activeSection === id ? "text-primary" : "text-muted-foreground/70"}`} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
        
        <div className="pt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 px-3 mb-1">Tools & Reflection</p>
          <div className="space-y-0.5">
            {NAV_ITEMS.filter(i => i.group !== 'main').map(({ id, label, Icon }) => (
              <button key={id} type="button" onClick={() => navTo(id)} className={`nav-item w-full text-left relative ${activeSection === id ? "active" : ""}`}>
                <Icon className={`w-3.5 h-3.5 shrink-0 ${activeSection === id ? "text-primary" : "text-muted-foreground/70"}`} />
                <span className="truncate text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/20 p-3">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-black text-foreground">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate leading-tight">{displayName}</p>
            <p className="text-[10px] text-muted-foreground/55 leading-tight mt-0.5">{agentDisplayName} is with you</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "home":       return <HomePage userId={userId} onNavigate={navTo} />;
      case "tasks":      return <TasksPanel userId={userId} />;
      case "schedule":   return <SchedulePanel userId={userId} />;
      case "journal":    return <JournalPanel userId={userId} />;
      case "reminders":  return <RemindersPanel />;
      case "target":     return <TargetPanel />;
      case "graph":      return <GraphPanel userId={userId} />;
      case "calendar":   return <CalendarPanel userId={userId} />;
      case "ai-agent":   return <AssistantPanel userId={userId} />;
      case "assistant":  return <AssistantPanel userId={userId} />;
      case "background": return <BackgroundPanel />;
      case "music":      return <MusicPlayerPanel />;
      case "alarm":      return <AlarmPanel />;
      case "focus":
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="glass-card-strong p-8 text-center max-w-sm">
              <Brain className="w-14 h-14 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-black premium-gradient-text mb-2">Focus Lock Mode</h2>
              <p className="text-muted-foreground text-sm mb-6">Enter a distraction-free Pomodoro session with your AI mentor guiding you through.</p>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setFocusLockActive(true)}
                className="btn-premium w-full py-3 text-base"
              >
                🔒 Enter Focus Mode
              </motion.button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const activeItem = NAV_ITEMS.find((n) => n.id === activeSection);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Focus Lock Overlay */}
      {focusLockActive && (
        <FocusLockMode taskName="Deep Work Session" onExit={() => setFocusLockActive(false)} />
      )}

      {/* ── Hook Banner ── */}
      <HookBanner />

      {/* ── Top Header ── */}
      <header className="flex items-center gap-2 px-3 md:px-5 shrink-0 border-b border-border/25 glass-card-strong rounded-none relative z-[100]" style={{ height: "52px" }}>
        <Button variant="ghost" size="icon" className="md:hidden shrink-0 text-muted-foreground h-8 w-8 -ml-1" onClick={() => setSidebarOpen(true)} data-ocid="nav.menu.button">
          <Menu className="w-4 h-4" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center glow-primary">
            <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-black tracking-tight premium-gradient-text hidden sm:block">FocusFlow</span>
        </div>

        <div className="h-4 w-px bg-border/30 mx-1 hidden md:block" />

        {/* Desktop nav pills (Main only) */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1 relative h-full !overflow-visible">
          {NAV_ITEMS.filter(i => i.group === 'main' && (i.id as string) !== 'more').map(({ id, label, Icon }) => (
            <button type="button" key={id} onClick={() => navTo(id)} className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSection === id ? "text-primary" : "text-muted-foreground/60 hover:text-muted-foreground"}`}>
              {activeSection === id && <motion.div layoutId="nav-active-bg" className="absolute inset-0 bg-primary/10 rounded-lg -z-10" />}
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
          
          <div className="relative h-full flex items-center" ref={moreMenuRef}>
            <button 
              type="button" 
              onClick={() => setMoreMenuOpen(!moreMenuOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${moreMenuOpen ? "text-primary bg-primary/15" : "text-muted-foreground/60 hover:text-white"}`}
            >
              <MoreHorizontal className="w-4 h-4" />
              <span>More</span>
            </button>
            <AnimatePresence>
              {moreMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-[80%] right-0 mt-2 z-[999] min-w-[200px]"
                >
                  <div className="glass-card-strong border-white/10 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden bg-black/90 backdrop-blur-xl">
                    <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] px-3 py-2 mb-1 border-b border-white/5">System Tools</div>
                    <div className="max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {NAV_ITEMS.filter(i => i.group !== 'main').map(({ id, label, Icon }) => (
                        <button 
                          key={id} 
                          type="button" 
                          onClick={() => { navTo(id); setMoreMenuOpen(false); }} 
                          className={`flex items-center gap-3 w-full px-3 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/10 rounded-lg whitespace-nowrap ${activeSection === id ? "text-primary bg-primary/5" : "text-white/40 hover:text-white"}`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        <div className="flex-1 md:flex-none" />

        {activeItem && (
          <div className="flex md:hidden items-center gap-1.5">
            <activeItem.Icon className="w-3.5 h-3.5 text-primary/80" />
            <span className="text-sm font-semibold text-foreground">{activeItem.label}</span>
          </div>
        )}
        <div className="flex-1 md:hidden" />

        {/* Streak + Focus Lock shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={() => setFocusLockActive(true)} title="Enter Focus Mode"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/15 transition-all"
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Focus</span>
          </button>
          <ProfileMenu username={displayName} onLogout={handleLogout} onOpenSettings={() => navTo("background")} />
        </div>
      </header>

      {/* ── Mobile sidebar overlay ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)}
            />
            <motion.aside initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-60 z-50 glass-card-strong border-r border-border/25 flex flex-col md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={activeSection} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto p-4 md:p-6 pb-6"
          >
            {activeSection !== "home" && activeSection !== "focus" && (
              <div data-ocid="quote.card" className="mb-5 flex items-start gap-3 px-4 py-3 rounded-2xl glass-card">
                <Zap className="w-4 h-4 text-primary/80 mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/70 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
              </div>
            )}
            {renderSection()}
          </motion.div>
        </AnimatePresence>
      </div>

      {userId && <HourlyCheck userId={userId} />}
    </div>
  );
}
