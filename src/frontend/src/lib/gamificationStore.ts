import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface GamificationState {
  xp: number;
  level: number;
  streakDays: number;
  lastActiveDate: string;
  tasksCompleted: number;
  focusMinutes: number;

  addXp: (amount: number) => void;
  checkStreak: () => void;
  completeTask: () => void;
  addFocusMinutes: (mins: number) => void;
  reset: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set) => ({
      xp: 0,
      level: 1,
      streakDays: 0,
      lastActiveDate: '',
      tasksCompleted: 0,
      focusMinutes: 0,

      addXp: (amount) => set((state) => {
        const newXp = state.xp + amount;
        const newLevel = Math.floor(newXp / 100) + 1;
        return { xp: newXp, level: newLevel };
      }),

      checkStreak: () => set((state) => {
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        if (state.lastActiveDate === today) {
          return state; // Already checked in today
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA');

        if (state.lastActiveDate === yesterdayStr) {
          // Continued streak!
          return { streakDays: state.streakDays + 1, lastActiveDate: today };
        }

        // Streak broken or first time
        return { streakDays: 1, lastActiveDate: today };
      }),

      completeTask: () => set((state) => {
        const newXp = state.xp + 10; // 10 XP per task
        const newLevel = Math.floor(newXp / 100) + 1;
        return { 
          tasksCompleted: state.tasksCompleted + 1,
          xp: newXp,
          level: newLevel
        };
      }),

      addFocusMinutes: (mins) => set((state) => {
        const newXp = state.xp + (mins * 2); // 2 XP per minute focused
        const newLevel = Math.floor(newXp / 100) + 1;
        return {
          focusMinutes: state.focusMinutes + mins,
          xp: newXp,
          level: newLevel
        };
      }),

      reset: () => set({
        xp: 0,
        level: 1,
        streakDays: 0,
        lastActiveDate: '',
        tasksCompleted: 0,
        focusMinutes: 0
      })
    }),
    {
      name: 'focusflow-gamification',
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
