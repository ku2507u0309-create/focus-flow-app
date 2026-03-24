// ─── LocalStorage Utilities ───────────────────────────────────────────────────

export type ProductivityStatus = "Productive" | "Neutral" | "Wasted";
export type ProductivityLog = Record<string, ProductivityStatus>;
export type DailyLog = Record<string, boolean>;
export type JournalEntry = string;

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDateStr(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Productivity Log ─────────────────────────────────────────────────────────

export function getProductivityLog(
  userId: string,
  dateStr: string,
): ProductivityLog {
  try {
    const key = `productivity_${userId}_${dateStr}`;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ProductivityLog) : {};
  } catch {
    return {};
  }
}

export function setProductivityHour(
  userId: string,
  dateStr: string,
  hour: string,
  status: ProductivityStatus,
): void {
  const key = `productivity_${userId}_${dateStr}`;
  const log = getProductivityLog(userId, dateStr);
  log[hour] = status;
  localStorage.setItem(key, JSON.stringify(log));
}

export function getTodayProductivityLog(userId: string): ProductivityLog {
  return getProductivityLog(userId, todayStr());
}

// ─── Daily Schedule Log ───────────────────────────────────────────────────────

export function getDailyLog(userId: string, dateStr: string): DailyLog {
  try {
    const key = `dailylog_${userId}_${dateStr}`;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DailyLog) : {};
  } catch {
    return {};
  }
}

export function setDailyLogItem(
  userId: string,
  dateStr: string,
  itemId: string,
  completed: boolean,
): void {
  const key = `dailylog_${userId}_${dateStr}`;
  const log = getDailyLog(userId, dateStr);
  log[itemId] = completed;
  localStorage.setItem(key, JSON.stringify(log));
}

// ─── Journal ──────────────────────────────────────────────────────────────────

export function getJournalEntry(userId: string, dateStr: string): JournalEntry {
  try {
    const key = `journal_${userId}_${dateStr}`;
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function saveJournalEntry(
  userId: string,
  dateStr: string,
  content: string,
): void {
  const key = `journal_${userId}_${dateStr}`;
  localStorage.setItem(key, content);
}

// ─── Daily Task Completion Snapshot ──────────────────────────────────────────
// Saves task completion % per day so the 7-day graph can read historical data.

export function saveDailyTaskCompletion(
  userId: string,
  dateStr: string,
  pct: number,
): void {
  const key = `taskcompletion_${userId}_${dateStr}`;
  localStorage.setItem(key, String(pct));
}

export function saveDailyScheduleCompletion(
  userId: string,
  dateStr: string,
  pct: number,
): void {
  const key = `schedulecompletion_${userId}_${dateStr}`;
  localStorage.setItem(key, String(pct));
}

export function getDailyTaskCompletion(
  userId: string,
  dateStr: string,
): number {
  try {
    const key = `taskcompletion_${userId}_${dateStr}`;
    const raw = localStorage.getItem(key);
    return raw !== null ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

export function getDailyScheduleCompletion(
  userId: string,
  dateStr: string,
): number {
  try {
    const key = `schedulecompletion_${userId}_${dateStr}`;
    const raw = localStorage.getItem(key);
    return raw !== null ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

// ─── Productivity Score Calculation ──────────────────────────────────────────

export function getProductivityScore(
  userId: string,
  dateStr: string,
  taskCompletionPct: number,
  scheduleCompletionPct: number,
): number {
  const log = getProductivityLog(userId, dateStr);
  const entries = Object.values(log);
  let hourlyScore = 0;
  if (entries.length > 0) {
    const productiveCount = entries.filter((s) => s === "Productive").length;
    hourlyScore = (productiveCount / entries.length) * 100;
  }
  
  let total = taskCompletionPct + scheduleCompletionPct;
  let count = 2;
  
  if (entries.length > 0) {
    total += hourlyScore;
    count += 1;
  }
  return Math.round(total / count);
}

export function getLast7DaysScores(
  userId: string,
  todayTaskCompletionPct: number,
  todayScheduleCompletionPct: number,
): Array<{ date: string; score: number; label: string }> {
  const result: Array<{ date: string; score: number; label: string }> = [];
  const today = new Date();
  const todayStr2 = formatDateStr(today);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateStr(d);

    const taskPct =
      dateStr === todayStr2
        ? todayTaskCompletionPct
        : getDailyTaskCompletion(userId, dateStr);

    const schedulePct =
      dateStr === todayStr2
        ? todayScheduleCompletionPct
        : getDailyScheduleCompletion(userId, dateStr);

    const score = getProductivityScore(userId, dateStr, taskPct, schedulePct);

    result.push({
      date: dateStr,
      score,
      label:
        i === 0 ? "Today" : d.toLocaleDateString("en", { weekday: "short" }),
    });
  }

  return result;
}

export function getDailyCompletionPct(
  userId: string,
  dateStr: string,
  totalItems: number,
): number {
  if (totalItems === 0) return 0;
  const log = getDailyLog(userId, dateStr);
  const completed = Object.values(log).filter(Boolean).length;
  return Math.round((completed / totalItems) * 100);
}

export { formatDateStr, todayStr };
