import { useEffect, useRef } from "react";
import { useAgentStore } from "../lib/agentStore";
import { useSaveAssistantMessage } from "./useQueries";

export function useAutoAssistant() {
  const { dailyTasks, onboardingDone, speak } = useAgentStore();
  const { mutateAsync: saveMessage } = useSaveAssistantMessage();
  
  const lastInteraction = useRef(Date.now());
  const promptedInactivity = useRef(false);
  const promptedEmpty = useRef(false);
  const promptedReminders = useRef<Set<string>>(new Set());

  // 1. Inactivity (20 min)
  useEffect(() => {
    if (!onboardingDone) return;

    const handleActivity = () => {
      lastInteraction.current = Date.now();
      promptedInactivity.current = false;
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);

    const interval = setInterval(() => {
      const inactiveFor = Date.now() - lastInteraction.current;
      if (inactiveFor > 20 * 60 * 1000 && !promptedInactivity.current) {
        promptedInactivity.current = true;
        const msg = "Hey, you've been inactive. Want to continue?";
        speak(msg, "general", 8000);
        saveMessage({ role: "assistant", text: msg }).catch(console.error);
      }
    }, 60000);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      clearInterval(interval);
    };
  }, [onboardingDone, saveMessage, speak]);

  // 2. Empty Schedule
  useEffect(() => {
    if (!onboardingDone) return;
    
    // Slight delay to avoid firing immediately on load before state hydrates properly
    const timeoutId = setTimeout(() => {
      if (dailyTasks.length === 0 && !promptedEmpty.current) {
        promptedEmpty.current = true;
        const msg = "Want to plan your day?";
        speak(msg, "general", 8000);
        saveMessage({ role: "assistant", text: msg }).catch(console.error);
      } else if (dailyTasks.length > 0) {
        promptedEmpty.current = false;
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [dailyTasks.length, onboardingDone, saveMessage, speak]);

  // 3. Task Reminders
  useEffect(() => {
    if (!onboardingDone) return;
    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, "0");
      const currentMinutes = now.getMinutes().toString().padStart(2, "0");
      const currentTime = `${currentHours}:${currentMinutes}`;

      dailyTasks.forEach(task => {
        if (!task.completed && task.time === currentTime && !promptedReminders.current.has(task.id)) {
          promptedReminders.current.add(task.id);
          const msg = `Time for your scheduled task: ${task.title}. Start now?`;
          speak(msg, "general", 8000);
          saveMessage({ role: "assistant", text: msg }).catch(console.error);
        }
      });
    }, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [dailyTasks, onboardingDone, saveMessage, speak]);
}
