import { BarChart2, TrendingUp } from "lucide-react";
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
import { getLast7DaysScores, getDailyScheduleCompletion, todayStr } from "../../utils/localStorage";

interface GraphProps {
  userId: string;
}

function getBarColor(score: number): string {
  if (score >= 70) return "oklch(0.65 0.15 145)"; // green
  if (score >= 40) return "oklch(0.70 0.155 195)"; // cyan
  return "oklch(0.55 0.18 285)"; // violet
}

interface TooltipPayload {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div className="glass-card-strong p-3 rounded-xl shadow-glass">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-bold text-primary">{score}</p>
      <p className="text-xs text-muted-foreground">productivity score</p>
    </div>
  );
}

export default function GraphPanel({ userId }: GraphProps) {
  const { data: tasks = [] } = useGetTasks();

  const taskCompletionPct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.isComplete).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  const scheduleCompletionPct = useMemo(() => {
    return getDailyScheduleCompletion(userId, todayStr());
  }, [userId]);

  const data = useMemo(
    () => getLast7DaysScores(userId, taskCompletionPct, scheduleCompletionPct),
    [userId, taskCompletionPct, scheduleCompletionPct],
  );

  const avgScore = useMemo(() => {
    const sum = data.reduce((a, d) => a + d.score, 0);
    return Math.round(sum / data.length);
  }, [data]);

  const bestDay = useMemo(() => {
    return data.reduce((best, d) => (d.score > best.score ? d : best), data[0]);
  }, [data]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">Rolling window</p>
        <h2 className="section-title">7-Day Productivity</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Combined task completion + hourly check-ins (score 0–100)
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary tabular-nums">
            {avgScore}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">7-day avg</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-success tabular-nums">
            {bestDay?.score ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">best day</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {taskCompletionPct}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">tasks done</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Productivity Score
          </span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 4, left: -16 }}
              barCategoryGap="25%"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(100,200,240,0.08)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "oklch(0.60 0.02 230)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "oklch(0.60 0.02 230)" }}
                axisLine={false}
                tickLine={false}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(100,200,240,0.06)" }}
              />
              <Bar dataKey="score" radius={[6, 6, 2, 2]}>
                {data.map((entry) => (
                  <Cell key={entry.date} fill={getBarColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-3">
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: "oklch(0.65 0.15 145)" }}
            />
            <span className="text-xs text-muted-foreground">High (70+)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: "oklch(0.70 0.155 195)" }}
            />
            <span className="text-xs text-muted-foreground">
              Medium (40–70)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: "oklch(0.55 0.18 285)" }}
            />
            <span className="text-xs text-muted-foreground">Low (&lt;40)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
