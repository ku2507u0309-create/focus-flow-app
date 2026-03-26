import { Progress } from "@/components/ui/progress";
import {
  BarChart2,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  Clock,
  Home,
  Palette,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetTasks } from "../../hooks/useQueries";
import { 
  getLast7DaysScores, 
  getDailyScheduleCompletion, 
  todayStr 
} from "../../utils/localStorage";
import { getDailyQuote } from "../../utils/quotes";
import { useAgentStore } from "../../lib/agentStore";

type Section =
  | "home"
  | "tasks"
  | "schedule"
  | "journal"
  | "reminders"
  | "target"
  | "graph"
  | "calendar"
  | "background"
  | "schedule"
  | "ai-agent";

interface HomePageProps {
  userId: string;
  onNavigate: (section: Section) => void;
}

const NAV_CARDS: Array<{
  id: Section;
  label: string;
  description: string;
  Icon: React.ElementType;
  color: string;
}> = [
  {
    id: "tasks",
    label: "Weekly Tasks",
    description: "Track and complete your weekly goals",
    Icon: CheckSquare,
    color: "from-cyan-500/20 to-cyan-600/5",
  },
  {
    id: "schedule",
    label: "Routine",
    description: "Manage your daily schedule and routine template",
    Icon: Clock,
    color: "from-violet-500/20 to-violet-600/5",
  },
  {
    id: "target",
    label: "My Target",
    description: "Set and track your personal goal",
    Icon: Target,
    color: "from-amber-500/20 to-amber-600/5",
  },
  {
    id: "journal",
    label: "Journal",
    description: "Reflect and write daily entries",
    Icon: BookOpen,
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    id: "reminders",
    label: "Reminders",
    description: "Upcoming events and birthdays",
    Icon: Bell,
    color: "from-rose-500/20 to-rose-600/5",
  },
  {
    id: "graph",
    label: "Productivity",
    description: "Your 7-day productivity score",
    Icon: BarChart2,
    color: "from-blue-500/20 to-blue-600/5",
  },
  {
    id: "calendar",
    label: "Calendar",
    description: "Monthly progress overview",
    Icon: CalendarDays,
    color: "from-indigo-500/20 to-indigo-600/5",
  },
  {
    id: "background",
    label: "Customize",
    description: "Change theme and background",
    Icon: Palette,
    color: "from-pink-500/20 to-pink-600/5",
  },
];

function getBarColor(score: number): string {
  if (score >= 70) return "oklch(0.65 0.15 145)";
  if (score >= 40) return "oklch(0.70 0.155 195)";
  return "oklch(0.55 0.18 285)";
}

interface TooltipPayload {
  value: number;
}

function MiniTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-strong px-2.5 py-1.5 rounded-lg text-xs">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold text-primary">{payload[0].value}</p>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function HomePage({ userId, onNavigate }: HomePageProps) {
  const { data: tasks = [] } = useGetTasks();
  const quote = getDailyQuote();

  const taskCompletionPct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.isComplete).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const scheduleCompletionPct = useMemo(() => {
    return getDailyScheduleCompletion(userId, todayStr());
  }, [userId]);

  const chartData = useMemo(
    () => getLast7DaysScores(userId, taskCompletionPct, scheduleCompletionPct),
    [userId, taskCompletionPct, scheduleCompletionPct],
  );

  const avgScore = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.round(
      chartData.reduce((a, d) => a + d.score, 0) / chartData.length,
    );
  }, [chartData]);

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const displayName = userId === "anonymous" ? "there" : userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Greeting ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card-strong p-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center glow-primary shrink-0">
            <Home className="w-4 h-4 text-primary" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs text-primary/60 font-semibold uppercase tracking-widest">
              Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground leading-tight">
              {greeting},{" "}
              <span className="text-primary capitalize">{displayName}</span> 👋
            </h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2 ml-12">
          Here's your productivity hub — pick where to focus today.
        </p>
      </motion.div>

      {/* ── Quote ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-primary/8 border border-primary/15 backdrop-blur-sm"
        data-ocid="home.card"
      >
        <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <Zap className="w-2.5 h-2.5 text-primary" strokeWidth={2.5} />
        </div>
        <p className="text-sm text-foreground/75 italic leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
      </motion.div>

      {/* ── Nav Cards ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
      >
        {NAV_CARDS.map(({ id, label, description, Icon, color }) => (
          <motion.button
            key={id}
            variants={cardVariants}
            type="button"
            data-ocid={`home.${id}.button`}
            onClick={() => onNavigate(id)}
            className="glass-card hover-lift p-4 text-left flex flex-col gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group cursor-pointer"
          >
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center border border-white/8 shrink-0`}
            >
              <Icon className="w-4 h-4 text-foreground/80" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                {label}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                {description}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      {/* ── Progress Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="glass-card hover-lift p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              7-Day Productivity
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              Avg:{" "}
              <span className="text-primary font-bold tabular-nums">
                {avgScore}
              </span>
            </span>
            <span>
              Tasks:{" "}
              <span className="text-foreground font-semibold tabular-nums">
                {taskCompletionPct}%
              </span>
            </span>
          </div>
        </div>

        {/* Compact task progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>Weekly task completion</span>
            <span className="font-semibold text-foreground">
              {taskCompletionPct}%
            </span>
          </div>
          <Progress value={taskCompletionPct} className="h-1.5 bg-muted/25" />
        </div>

        {/* Bar chart */}
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 2, right: 4, bottom: 0, left: -20 }}
              barCategoryGap="28%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(100,200,240,0.07)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "oklch(0.58 0.018 232)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: "oklch(0.58 0.018 232)" }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 50, 100]}
              />
              <Tooltip
                content={<MiniTooltip />}
                cursor={{ fill: "rgba(100,200,240,0.05)" }}
              />
              <Bar dataKey="score" radius={[4, 4, 2, 2]}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={getBarColor(entry.score)}
                    data-ocid="home.chart_point"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <button
          type="button"
          data-ocid="home.graph.button"
          onClick={() => onNavigate("graph")}
          className="mt-2 text-xs text-primary/60 hover:text-primary transition-colors"
        >
          View full analytics →
        </button>
      </motion.div>
    </div>
  );
}
