import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MentorPersonality } from './mentorEngine';

export interface AgentMessage {
  id: string;
  text: string;
  type: 'greeting' | 'compliment' | 'consolation' | 'general' | 'pressure' | 'review';
}

export type AgentPersonality = MentorPersonality;

// ─── Full Onboarding Context ──────────────────────────────────────────────────
export interface MentorProfile {
  agentName:          string;
  personality:        AgentPersonality;
  userFullName:       string;       
  userGoal:           string;       // 1. Main goal
  reason:             string;       // 2. Why this goal matters
  deadlineDays:       number;       // 3. Deadline (days)
  biggestDistraction: string;       // 4. Biggest distraction
  weakTime:           string;       // 5. When focus is lost
  userWeakness:       string;       // 6. Main weakness
  style:              string;       // 7. Preferred guidance style
  roleModel:          string;       // 8. Role model
  whyRoleModel:       string;       // 9. Why this role model
  wakeTime:           string;       // 10a. Wake time
  focusHours:         number;       // 10b. Focus hours
  consequence:        string;       // 11. What happens if not achieved
  commitment:         string;       // 12. Commitment level
  onboardingDone:     boolean;
  weekendWakeTime:    string;
  weekendFocusHours:  number;
  customSchedule:     { time: string; task: string; dayType: 'weekday' | 'weekend' | 'both' }[];
  dailyTasks:         { id: string; time: string; title: string; completed: boolean }[];
  lastPresenceCheck:  string | null;
}

interface AgentState extends MentorProfile {
  // Ephemeral — not persisted
  messages: AgentMessage[];
  isVisible: boolean;

  speak:         (text: string, type?: AgentMessage['type'], duration?: number) => void;
  clearMessage:  (id: string) => void;
  setVisibility: (visible: boolean) => void;
  setFullContext:(profile: Partial<MentorProfile>) => void;
  resetMentor:   () => void;
  addDailyTask:  (time: string, title: string) => void;
  toggleDailyTask: (id: string, completed: boolean) => void;
  removeDailyTask: (id: string) => void;
}

const DEFAULT_PROFILE: MentorProfile = {
  agentName:          'AI Assistant',
  personality:        'friendly',
  userFullName:       '',
  userGoal:           '',
  reason:             '',
  deadlineDays:       30,
  biggestDistraction: '',
  weakTime:           '',
  userWeakness:       '',
  style:              'friendly',
  roleModel:          'AI Assistant',
  whyRoleModel:       '',
  wakeTime:           '06:00',
  focusHours:         4,
  consequence:        '',
  commitment:         '',
  onboardingDone:     false,
  weekendWakeTime:    '08:00',
  weekendFocusHours:  2,
  customSchedule:     [],
  dailyTasks:         [],
  lastPresenceCheck:  null,
};

export const useAgentStore = create<AgentState>()(
  persist(
    (set) => ({
      ...DEFAULT_PROFILE,
      messages: [],
      isVisible: true,

      speak: (text, type = 'general', duration = 6000) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        set((state) => ({
          messages: [...state.messages.slice(-3), { id, text, type }],
          isVisible: true,
        }));
        if (duration > 0) {
          setTimeout(() => {
            set((state) => ({
              messages: state.messages.filter((m) => m.id !== id),
            }));
          }, duration);
        }
      },

      clearMessage: (id) =>
        set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),

      setVisibility: (visible) => set({ isVisible: visible }),

      setFullContext: (profile) => set((state) => ({ ...state, ...profile })),

      resetMentor: () => set({ ...DEFAULT_PROFILE, messages: [] }),

      addDailyTask: (time, title) => set((state) => ({
        dailyTasks: [...state.dailyTasks, { id: Math.random().toString(36).substring(7), time, title, completed: false }]
      })),
      toggleDailyTask: (id, completed) => set((state) => ({
        dailyTasks: state.dailyTasks.map(t => t.id === id ? { ...t, completed } : t)
      })),
      removeDailyTask: (id) => set((state) => ({
        dailyTasks: state.dailyTasks.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'focusflow-agent-v4', // bumped version
      partialize: (state) => ({
        agentName:          state.agentName,
        personality:        state.personality,
        userFullName:       state.userFullName,
        userGoal:           state.userGoal,
        reason:             state.reason,
        deadlineDays:       state.deadlineDays,
        biggestDistraction: state.biggestDistraction,
        weakTime:           state.weakTime,
        userWeakness:       state.userWeakness,
        style:              state.style,
        roleModel:          state.roleModel,
        whyRoleModel:       state.whyRoleModel,
        wakeTime:           state.wakeTime,
        focusHours:         state.focusHours,
        consequence:        state.consequence,
        commitment:         state.commitment,
        onboardingDone:     state.onboardingDone,
        messages:           state.messages,
        weekendWakeTime:    state.weekendWakeTime,
        weekendFocusHours:  state.weekendFocusHours,
        customSchedule:     state.customSchedule,
        dailyTasks:         state.dailyTasks,
        lastPresenceCheck:  state.lastPresenceCheck,
      }),
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const user = localStorage.getItem('username') || 'default';
          return localStorage.getItem(`${name}_${user}`);
        },
        setItem: (name, value) => {
          const user = localStorage.getItem('username') || 'default';
          localStorage.setItem(`${name}_${user}`, value);
        },
        removeItem: (name) => {
          const user = localStorage.getItem('username') || 'default';
          localStorage.removeItem(`${name}_${user}`);
        }
      })),
    }
  )
);
