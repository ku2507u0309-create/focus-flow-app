/**
 * ╔══════════════════════════════════════════════════════════════╗
 *  FOCUSFLOW — AI MENTOR ENGINE
 *  A context-aware, personality-driven mentor behavior system.
 *  Thinks: "What would this mentor say to THIS user RIGHT NOW?"
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type MentorPersonality = 'kohli' | 'stoic' | 'friendly' | 'calm';
export type MentorTrigger =
  | 'daily_start'
  | 'task_start'
  | 'task_complete'
  | 'task_fail'
  | 'focus_mid'
  | 'focus_end'
  | 'focus_exit_attempt'
  | 'idle'
  | 'hourly_morning'
  | 'hourly_midday'
  | 'hourly_evening'
  | 'hourly_behind'
  | 'night_review_good'
  | 'night_review_bad'
  | 'streak_high'
  | 'streak_broken'
  | 'xp_level_up'
  | 'if_i_were_you_focus'
  | 'if_i_were_you_distracted'
  | 'if_i_were_you_planning'
  | 'alarm_trigger'
  | 'alarm_delay';

export interface MentorContext {
  agentName: string;
  personality: MentorPersonality;
  roleModel: string;           // "Virat Kohli", "Jocko Willink", etc.
  userGoal: string;            // "Crack IIT", "Launch my startup"
  userWeakness: string;        // "Distraction", "Procrastination"
  streakDays: number;
  level: number;
  xp: number;
  tasksCompleted: number;
  taskName?: string;           // current task being acted upon
  hour?: number;               // current hour (0-23)
  tasksBehind?: boolean;       // behind on schedule?
}

// ─── Response Banks ───────────────────────────────────────────────────────────

const MENTOR_BANKS: Record<MentorPersonality, Record<MentorTrigger, string[]>> = {
  kohli: {
    daily_start: [
      "Today matters. Don't waste a single minute.",
      "Start before motivation fades. Champions don't wait.",
      "You want results? Then act like it. Now.",
      "Every great day starts with one decision. Make it.",
    ],
    task_start: [
      "Good. Start strong and don't look back.",
      "Lock in. This is your time — own it.",
      "Focus. Zero distractions. Go.",
      "This is where the work happens. Do it right.",
    ],
    task_complete: [
      "Good. That's how it's done. Repeat this.",
      "One down. Keep this momentum going.",
      "That's progress. Don't stop now.",
      "Clean. Now recover and reload for the next one.",
    ],
    task_fail: [
      "You're not taking this seriously enough.",
      "Fix this now. No excuses.",
      "This is a pattern. Break it today.",
      "Failure means nothing if you get back up. Get up.",
    ],
    focus_mid: [
      "Stay locked in. Don't lose this momentum.",
      "If I were you, I'd go harder right now.",
      "You're in the zone — don't break it.",
      "This is where discipline separates winners.",
      "Don't check your phone. Stay here.",
    ],
    focus_end: [
      "That was a real session. Well done.",
      "You did the work. That's not nothing.",
      "Recovery now. Then we go again.",
    ],
    focus_exit_attempt: [
      "Are you quitting already? This is where discipline is built.",
      "Don't break now. You'll regret it.",
      "This is exactly where most people fail. Don't be most people.",
      "5 more minutes. That's all. Push.",
    ],
    idle: [
      "Why are you stopping?",
      "This is where most people fail. Don't be one of them.",
      "Idle time is not rest. Get back to work.",
      "Every minute wasted is a debt to your future self.",
    ],
    hourly_morning: [
      "You should already be working.",
      "Morning is gold. Don't sleep on it.",
      "Champions are already 2 hours in. Where are you?",
    ],
    hourly_midday: [
      "Stay consistent. No drop in energy midday.",
      "Lunch break is over in your head. Keep going.",
      "You're in the grind window. Don't slow down.",
    ],
    hourly_evening: [
      "Finish strong. Evening is not the time to coast.",
      "Close out what you started today.",
      "One more hour of real work. That's all.",
    ],
    hourly_behind: [
      "You're behind schedule. Fix it now.",
      "Time lost doesn't come back. Catch up.",
      "Stop delaying. The clock doesn't pause for you.",
    ],
    night_review_good: [
      "Solid day. Maintain this standard tomorrow.",
      "Good work. Now rest, recover, and do it again.",
      "You earned this rest. Be back stronger tomorrow.",
    ],
    night_review_bad: [
      "You could have done better. You know it.",
      "Today wasn't your best. Tomorrow is your chance.",
      "Don't go to bed satisfied with this. Fix it tomorrow.",
    ],
    streak_high: [
      "You're building something real. Don't break it.",
      "This streak is who you're becoming. Protect it.",
      "Consistency is your weapon. Use it.",
    ],
    streak_broken: [
      "Streak broken. That's okay — reset and rebuild.",
      "One missed day is not failure. Quitting is.",
      "Start the streak again. Today.",
    ],
    xp_level_up: [
      "Level up. This is what growth looks like.",
      "You're leveling up. Now raise the standard.",
      "New level. New responsibility. Deliver.",
    ],
    if_i_were_you_focus: [
      "If I were you, I'd tackle the hardest task right now — when energy is highest.",
      "If I were you, I'd put the phone down and lock in for 25 minutes.",
      "If I were you, I'd refuse to let one distraction take this hour.",
    ],
    if_i_were_you_distracted: [
      "If I were you, I wouldn't check my phone right now.",
      "If I were you, I'd close every tab that isn't work.",
      "If I were you, I'd ask: is what I'm doing right now moving the needle?",
    ],
    if_i_were_you_planning: [
      "If I were you, I'd set 3 non-negotiable tasks for today.",
      "If I were you, I'd identify the one task that matters most and start there.",
      "If I were you, I'd block 2 hours for deep work right now.",
    ],
    alarm_trigger: [
      "Wake up. Start now. No delays.",
      "Complete this before anything else.",
      "The alarm rang. That means action. Go.",
    ],
    alarm_delay: [
      "You're already losing time.",
      "Every second of delay is a choice against yourself.",
      "Get up. Right now. Not in 5 minutes.",
    ],
  },

  stoic: {
    daily_start: [
      "The day is here. Work with what you have.",
      "Obstacles are path. Begin.",
      "You control only this: your effort. Give it all.",
    ],
    task_start: [
      "Begin. The quality of the work matters.",
      "Do not rush. Do it right.",
      "Steady. Focused. Begin.",
    ],
    task_complete: [
      "Done. Move forward.",
      "Good process, good result. Repeat.",
      "That is how it should be done.",
    ],
    task_fail: [
      "A setback teaches. What's the lesson?",
      "Failure is feedback. Adjust and go again.",
      "Discipline is not lost from one failure. Restart.",
    ],
    focus_mid: [
      "Remain steady. The work is the only thing.",
      "Distraction is a choice. Choose work.",
      "You are in control of your attention. Use it.",
    ],
    focus_end: [
      "Well done. That was disciplined work.",
      "The work is done. Recover intentionally.",
    ],
    focus_exit_attempt: [
      "Resistance is normal. Work through it.",
      "The discomfort is where growth is.",
      "Do not flee difficulty. That is the point.",
    ],
    idle: [
      "You are wasting the one thing you can't get back.",
      "What is idle serving? Return to work.",
      "Rest has a time. This is not it.",
    ],
    hourly_morning: ["Begin. Morning energy is finite.", "The early hour belongs to the disciplined."],
    hourly_midday: ["Maintain the standard. No dip.", "Midday is not an excuse to slow down."],
    hourly_evening: ["Close the day well.", "End with discipline. Not with regret."],
    hourly_behind: ["You've fallen behind. Course-correct.", "A delay is not a failure. Inaction is."],
    night_review_good: ["You worked well. Repeat it.", "Good day. Sleep, recover, return."],
    night_review_bad: ["What will you do differently? Think on it.", "Tomorrow is the answer to today's failures."],
    streak_high: ["Consistency is character. Protect it.", "This is not luck. This is discipline."],
    streak_broken: ["Rebuild. No drama.", "Begin again. Calmly."],
    xp_level_up: ["Growth noted. Higher standards now.", "Level up means more responsibility."],
    if_i_were_you_focus: ["I would eliminate every distraction before starting.", "I would focus on one thing only."],
    if_i_were_you_distracted: ["I would ask: is this serving my goal?", "I would close everything and return to the work."],
    if_i_were_you_planning: ["I would choose three priorities. Not ten.", "I would start with the most difficult task."],
    alarm_trigger: ["The alarm means action. Begin.", "Start. The task will not complete itself."],
    alarm_delay: ["Delay compounds. Start now.", "Every delay is a decision."],
  },

  friendly: {
    daily_start: ["Hey! Today's a new shot. Let's make it great! 🌟", "Good morning! Your goals are waiting. Let's go! 💪", "New day, new energy! Let's crush it together!"],
    task_start: ["Let's go! You've got this 🚀", "Starting is the hardest part — and you just did it!", "Great choice! Dive in! ✨"],
    task_complete: ["YES! You did it! 🎉 +10 XP earned!", "Amazing! One step closer to your goal!", "That's what I'm talking about! Keep it up! 🔥"],
    task_fail: ["Hey, don't stress! Let's figure this out together.", "It's okay — every setback is a setup for a comeback!", "You're still in this. Let's try a different approach."],
    focus_mid: ["You're killing it! Keep going! 💪", "Halfway there! Don't stop now!", "I'm proud of how focused you are right now! ✨"],
    focus_end: ["That was incredible focus! You should be proud! 🎊", "Break time! You earned it! Come back stronger! ☕"],
    focus_exit_attempt: ["Wait — you're so close! Just a bit more! 🙏", "Don't stop now! Your future self will thank you!", "5 more minutes? You can definitely do this!"],
    idle: ["Hey, where'd you go? Let's get back on track! 😊", "I noticed you've been away — ready to jump back in?", "Your goals are waiting! Let's pick up where we left off!"],
    hourly_morning: ["Good morning! Time to launch into the day! ☀️", "Rise and grind! You've got awesome things to do today!"],
    hourly_midday: ["Midday check-in! You're doing great! Keep the energy up! ⚡", "How's the day going? Stay consistent — you're building momentum!"],
    hourly_evening: ["Evening push time! Finish strong! 🌆", "Almost done for today — make these last hours count!"],
    hourly_behind: ["Looks like you're a bit behind — no worries! Let's catch up together! 💪", "Quick sprint to get back on track! You can do it!"],
    night_review_good: ["What a day! You should be really proud of yourself! 🌟", "Incredible work today! Rest well — you earned it! ⭐"],
    night_review_bad: ["Today wasn't perfect, but tomorrow is a fresh start! 💫", "Every champion has off days. Tomorrow you bounce back!"],
    streak_high: ["Look at that streak! You're absolutely on fire! 🔥", "Consistency is paying off — you're crushing it!"],
    streak_broken: ["Streak ended, but you're still in this! Start again today! 💪", "Every legend resets sometimes. Begin again — stronger!"],
    xp_level_up: ["LEVEL UP! 🎮 You're growing so fast! The sky's the limit!", "NEW LEVEL UNLOCKED! I knew you could do it! 🎊"],
    if_i_were_you_focus: ["If I were you, I'd start with the task you're most excited about!", "If I were you, I'd put on some focus music and dive deep!"],
    if_i_were_you_distracted: ["If I were you, I'd take one breath and restart my timer!", "If I were you, I'd write down what distracted me, then let it go!"],
    if_i_were_you_planning: ["If I were you, I'd pick my top 3 wins for today!", "If I were you, I'd start planning with a quick brain dump!"],
    alarm_trigger: ["Wake up! Your task is waiting! Let's go! 🌅", "Time to tackle this! You've got the power! 💫"],
    alarm_delay: ["Hey, don't delay too long! Your future self is counting on you!", "Quick — start before the momentum fades!"],
  },

  calm: {
    daily_start: ["Begin gently. The day has what you need.", "One breath. Then begin.", "No rush. Just start."],
    task_start: ["Take your time. Do it well.", "Begin with intention.", "Settle in. The work is here."],
    task_complete: ["Done well. Rest a moment.", "Good work — acknowledge it.", "Complete. Move forward peacefully."],
    task_fail: ["That's okay. Begin again.", "Not every attempt succeeds. That's part of the journey.", "Take a breath. Then try again."],
    focus_mid: ["Stay present. The work is enough.", "Just this task. Nothing else.", "You're doing well. Keep going."],
    focus_end: ["Good session. Rest and restore.", "You showed up. That matters.", "Well done. Breathe."],
    focus_exit_attempt: ["Stay a little longer. You'll be glad you did.", "The discomfort passes. The result remains.", "Just a few more minutes. You can do this."],
    idle: ["Return when ready. But don't wait too long.", "Rest is fine. Drift is not.", "Gently — get back to it."],
    hourly_morning: ["The morning is calm and clear. Use it.", "Begin softly. Build rhythm."],
    hourly_midday: ["Stay grounded. Stay on track.", "One task at a time. You're doing fine."],
    hourly_evening: ["Wind down with purpose.", "Finish what matters. Let the rest go."],
    hourly_behind: ["You've slipped a little. Gently course-correct.", "No panic. Just refocus."],
    night_review_good: ["A peaceful, productive day. Rest well.", "You did what mattered. Sleep deeply."],
    night_review_bad: ["Tomorrow is a clean slate. Let this go.", "Rest now. Tomorrow, begin fresh."],
    streak_high: ["You've built something beautiful. Protect it.", "Consistency is its own reward."],
    streak_broken: ["Begin again. Quietly. No drama.", "The only failure is giving up. You haven't."],
    xp_level_up: ["A new level. A new chapter. Well done.", "Growth arrived quietly. Embrace it."],
    if_i_were_you_focus: ["If I were you, I'd remove one distraction and stay present.", "If I were you, I'd start small and let momentum build."],
    if_i_were_you_distracted: ["If I were you, I'd close my eyes for a moment, then return.", "If I were you, I'd gently redirect — no self-judgment."],
    if_i_were_you_planning: ["If I were you, I'd write just three intentions for today.", "If I were you, I'd begin with the simplest task to build flow."],
    alarm_trigger: ["Time to begin. Gently.", "Your task is ready when you are."],
    alarm_delay: ["Start soon. Time is a resource worth respecting.", "The sooner you begin, the better you'll feel."],
  },
};

// ─── Main Engine ─────────────────────────────────────────────────────────────

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a mentor message for a specific trigger and context.
 */
export function getMentorMessage(trigger: MentorTrigger, ctx: MentorContext): string {
  const bank = MENTOR_BANKS[ctx.personality] ?? MENTOR_BANKS.kohli;
  const lines = bank[trigger];
  let message = pick(lines ?? ["Stay focused."]);

  // Inject context variables
  message = message
    .replace(/\{name\}/g, ctx.agentName)
    .replace(/\{goal\}/g, ctx.userGoal)
    .replace(/\{weakness\}/g, ctx.userWeakness)
    .replace(/\{task\}/g, ctx.taskName ?? "your task")
    .replace(/\{streak\}/g, String(ctx.streakDays))
    .replace(/\{level\}/g, String(ctx.level));

  return message;
}

/**
 * Get the right hourly trigger based on current hour and schedule status.
 */
export function getHourlyTrigger(hour: number, behind: boolean): MentorTrigger {
  if (behind) return 'hourly_behind';
  if (hour >= 5  && hour < 12) return 'hourly_morning';
  if (hour >= 12 && hour < 18) return 'hourly_midday';
  return 'hourly_evening';
}

/**
 * Get the night review trigger based on whether the user had a good day.
 */
export function getNightReviewTrigger(tasksCompleted: number, totalTasks: number): MentorTrigger {
  const ratio = totalTasks > 0 ? tasksCompleted / totalTasks : 0;
  return ratio >= 0.7 ? 'night_review_good' : 'night_review_bad';
}

/**
 * Build a full context object merging store state with optional overrides.
 */
export function buildMentorContext(
  storeState: {
    agentName: string;
    personality: string;
    roleModel: string;
    userGoal: string;
    userWeakness: string;
    streakDays: number;
    level: number;
    xp: number;
    tasksCompleted: number;
  },
  overrides: Partial<MentorContext> = {}
): MentorContext {
  return {
    agentName: storeState.agentName || 'Nova',
    personality: (storeState.personality as MentorPersonality) || 'kohli',
    roleModel: storeState.roleModel || 'Virat Kohli',
    userGoal: storeState.userGoal || 'achieve my goals',
    userWeakness: storeState.userWeakness || 'distraction',
    streakDays: storeState.streakDays,
    level: storeState.level,
    xp: storeState.xp,
    tasksCompleted: storeState.tasksCompleted,
    ...overrides,
  };
}
