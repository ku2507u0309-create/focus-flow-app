import { useEffect, useRef } from 'react';
import { useAgentStore } from '../lib/agentStore';

export function useMentorPresence() {
  const { onboardingDone, wakeTime, roleModel, userGoal, speak, lastPresenceCheck, setFullContext } = useAgentStore();

  useEffect(() => {
    if (!onboardingDone) return;

    const interval = setInterval(() => {
      const now = new Date();
      const HHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // 1. Morning Greeting (Wake Time)
        if (HHMM === wakeTime && lastPresenceCheck !== 'morning') {
          speak(`Wake up. It's ${wakeTime}. The ${roleModel} mindset starts now. Your goal is "${userGoal}". No excuses.`, 'greeting', 10000);
          setFullContext({ lastPresenceCheck: 'morning' });
        }
  
        // 2. Midday Pressure (approx 13:00)
        if (HHMM === '13:00' && lastPresenceCheck !== 'midday') {
          speak(`Half the day is gone. Are you closer to your goal or just busy being busy?`, 'pressure', 8000);
          setFullContext({ lastPresenceCheck: 'midday' });
        }
  
        // 3. Evening Review (21:00)
        if (HHMM === '21:00' && lastPresenceCheck !== 'review') {
          speak(`Day is ending. Confront the mirror: Did you win today?`, 'review', 8000);
          setFullContext({ lastPresenceCheck: 'review' });
        }
  
        // 4. Hourly random push (if minutes are 00)
        if (now.getMinutes() === 0 && lastPresenceCheck !== `hourly-${now.getHours()}`) {
          // Only push during waking hours (e.g., 08:00 to 22:00)
          if (now.getHours() >= 8 && now.getHours() <= 22) {
            const pushes = [
              "Are you focusing? I'm watching.",
              "Intensity is your only weapon. Use it.",
              "Don't negotiate with your weakness.",
              "One hour closer to your deadline. Step up.",
              "If you were your role model, what would you be doing now?"
            ];
            speak(pushes[Math.floor(Math.random() * pushes.length)], 'pressure', 6000);
            setFullContext({ lastPresenceCheck: `hourly-${now.getHours()}` });
          }
        }

    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [onboardingDone, wakeTime, roleModel, userGoal, speak]);
}
