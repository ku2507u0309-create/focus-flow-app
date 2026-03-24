import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { appendAssistantMessage } from "../utils/assistant";

export enum BackgroundType {
  color = "color",
  image = "image"
}

// ─── Types ────────────────────────────────────────────

export interface WeekTask {
  id: bigint;
  title: string;
  description: string;
  isComplete: boolean;
  createdAt: bigint;
}

export interface ScheduleItem {
  id: bigint;
  title: string;
  duration: bigint;
}

export interface Reminder {
  id: bigint;
  title: string;
  isBirthday: boolean;
  isTriggered: boolean;
  dateTime: bigint;
}

export interface Target {
  id: number;
  title: string;
  currentValue: number;
  goalValue: number;
}

export interface UserSettings {
  backgroundType: BackgroundType;
  backgroundValue: string;
}

export interface UserProfile {
  username: string;
  email: string;
}

// ─── API Helper ─────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

function getToken() {
  return localStorage.getItem("authToken");
}

function getUserId() {
  return localStorage.getItem("username") || "user";
}

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
    Authorization: `Bearer ${token}`,
  };

  if (options.body && typeof options.body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    // If token is invalid/expired, clear it and reload to trigger re-login
    if (res.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("username");
      window.location.reload();
      throw new Error("Session expired. Please log in again.");
    }
    let msg = "API Error";
    try {
      const err = await res.json();
      msg = err.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

async function trackUserAction(kind: string, payload: string) {
  try {
    const res = await apiFetch(`/track-action?kind=${encodeURIComponent(kind)}&payload=${encodeURIComponent(payload)}`, { method: "POST" });
    return res.response as string;
  } catch (e) {
    console.error("Failed to track action", e);
    return null;
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  return useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile", getUserId()],
    queryFn: async () => {
      try {
        const data = await apiFetch("/user-profile");
        return data ? { username: data.username, email: data.email } : null;
      } catch {
        return null;
      }
    },
    enabled: !!getToken(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveCallerUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      await apiFetch("/user-profile", {
        method: "POST",
        body: JSON.stringify(profile),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function useGetTasks() {
  return useQuery<WeekTask[]>({
    queryKey: ["tasks", getUserId()],
    queryFn: async () => {
      if (!getToken()) return [];
      const data = await apiFetch("/tasks");
      return data.map((t: any) => ({
        id: BigInt(t.id),
        title: t.title,
        description: t.description || "",
        isComplete: t.isComplete,
        createdAt: BigInt(new Date(t.createdAt).getTime()),
      }));
    },
    enabled: !!getToken(),
    staleTime: 30 * 1000,
    retry: 3,
  });
}

export function useAddTask() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      const data = await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify({ title, description }),
      });
      return data;
    },
    onMutate: async ({ title, description }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", principalKey] });
      const previous = queryClient.getQueryData<WeekTask[]>(["tasks", principalKey]);
      const optimisticTask: WeekTask = {
        id: BigInt(-Date.now()),
        title,
        description,
        isComplete: false,
        createdAt: BigInt(Date.now()),
      };
      queryClient.setQueryData<WeekTask[]>(["tasks", principalKey], (old) => [...(old ?? []), optimisticTask]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["tasks", principalKey], context.previous);
      }
    },
    onSuccess: async (_data, variables) => {
      const msg = await trackUserAction("task_created", variables.title);
      if (msg) {
        toast(msg);
        appendAssistantMessage(principalKey, msg);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", principalKey] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ taskId, title, description, isComplete }: { taskId: bigint; title: string; description: string; isComplete: boolean }) => {
      await apiFetch(`/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify({ title, description, is_complete: isComplete }),
      });
    },
    onMutate: async ({ taskId, isComplete }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", principalKey] });
      const previous = queryClient.getQueryData<WeekTask[]>(["tasks", principalKey]);
      queryClient.setQueryData<WeekTask[]>(["tasks", principalKey], (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, isComplete } : t)) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", principalKey], context.previous);
    },
    onSuccess: async (_data, variables) => {
      if (variables.isComplete) {
        const msg = await trackUserAction("task_completed", variables.title);
        if (msg) {
          toast(msg);
          appendAssistantMessage(principalKey, msg);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", principalKey] });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async (taskId: bigint) => {
      await apiFetch(`/tasks/${taskId}`, { method: "DELETE" });
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", principalKey] });
      const previous = queryClient.getQueryData<WeekTask[]>(["tasks", principalKey]);
      queryClient.setQueryData<WeekTask[]>(["tasks", principalKey], (old) => old?.filter((t) => t.id !== taskId) ?? []);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", principalKey], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", principalKey] });
    },
  });
}

// ─── Schedule Template ────────────────────────────────────────────────────────

export function useGetScheduleTemplate() {
  return useQuery<ScheduleItem[]>({
    queryKey: ["scheduleTemplate", getUserId()],
    queryFn: async () => {
      if (!getToken()) return [];
      const data = await apiFetch("/schedule-template");
      return data.map((i: any) => ({
        id: BigInt(i.id),
        title: i.title,
        duration: BigInt(i.duration),
      }));
    },
    enabled: !!getToken(),
    staleTime: 30 * 1000,
  });
}

export function useAddScheduleItem() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ title, duration }: { title: string; duration: bigint }) => {
      const data = await apiFetch("/schedule-items", {
        method: "POST",
        body: JSON.stringify({ title, duration: Number(duration) }),
      });
      return BigInt(data.id);
    },
    onMutate: async ({ title, duration }) => {
      await queryClient.cancelQueries({ queryKey: ["scheduleTemplate", principalKey] });
      const previous = queryClient.getQueryData<ScheduleItem[]>(["scheduleTemplate", principalKey]);
      const optimisticItem: ScheduleItem = { id: BigInt(-Date.now()), title, duration };
      queryClient.setQueryData<ScheduleItem[]>(["scheduleTemplate", principalKey], (old) => [...(old ?? []), optimisticItem]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(["scheduleTemplate", principalKey], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduleTemplate", principalKey] });
    },
  });
}

export function useScheduleLocalOverrides(userId: string) {
  const DELETED_KEY = `scheduleDeleted_${userId}`;
  const ORDER_KEY = `scheduleItemOrder_${userId}`;
  const EDIT_KEY = `scheduleEdits_${userId}`;
  const TIME_KEY_PREFIX = `scheduleItemTime_${userId}_`;

  const getDeleted = (): string[] => {
    try {
      const raw = localStorage.getItem(DELETED_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };

  const markDeleted = (itemId: string) => {
    const deleted = getDeleted();
    if (!deleted.includes(itemId)) {
      localStorage.setItem(DELETED_KEY, JSON.stringify([...deleted, itemId]));
    }
  };

  const getOrder = (): string[] => {
    try {
      const raw = localStorage.getItem(ORDER_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  };

  const setOrder = (order: string[]) => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  };

  type EditRecord = { title?: string; duration?: string };
  const getEdits = (): Record<string, EditRecord> => {
    try {
      const raw = localStorage.getItem(EDIT_KEY);
      return raw ? (JSON.parse(raw) as Record<string, EditRecord>) : {};
    } catch {
      return {};
    }
  };

  const saveEdit = (itemId: string, edit: EditRecord) => {
    const edits = getEdits();
    edits[itemId] = edit;
    localStorage.setItem(EDIT_KEY, JSON.stringify(edits));
  };

  const getItemTime = (itemId: string): string => {
    return localStorage.getItem(`${TIME_KEY_PREFIX}${itemId}`) ?? "";
  };

  const setItemTime = (itemId: string, time: string) => {
    localStorage.setItem(`${TIME_KEY_PREFIX}${itemId}`, time);
  };

  return {
    getDeleted,
    markDeleted,
    getOrder,
    setOrder,
    getEdits,
    saveEdit,
    getItemTime,
    setItemTime,
  };
}

// ─── Reminders ────────────────────────────────────────────────────────────────

export function useGetReminders() {
  return useQuery<Reminder[]>({
    queryKey: ["reminders", getUserId()],
    queryFn: async () => {
      if (!getToken()) return [];
      const data = await apiFetch("/reminders");
      return data.map((r: any) => ({
        id: BigInt(r.id),
        title: r.title,
        isBirthday: r.isBirthday ?? r.is_birthday,
        isTriggered: r.isTriggered ?? r.is_triggered,
        dateTime: BigInt(new Date(r.dateTime ?? r.date_time).getTime()),
      }));
    },
    enabled: !!getToken(),
    staleTime: 30 * 1000,
  });
}

export function useAddReminder() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ title, dateTime, isBirthday }: { title: string; dateTime: bigint; isBirthday: boolean }) => {
      await apiFetch("/reminders", {
        method: "POST",
        body: JSON.stringify({
          title,
          dateTime: new Date(Number(dateTime)).toISOString(),
          isBirthday: isBirthday,
        }),
      });
    },
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reminders", principalKey] });
      const msg = await trackUserAction("reminder_added", variables.title);
      if (msg) {
        toast(msg);
        appendAssistantMessage(principalKey, msg);
      }
    },
  });
}

// ─── Target ───────────────────────────────────────────────────────────────────

export function useGetTargets() {
  return useQuery<Target[]>({
    queryKey: ["targets", getUserId()],
    queryFn: async () => {
      if (!getToken()) return [];
      try {
        const data = await apiFetch("/targets");
        if (data && Array.isArray(data)) {
          return data.map((t: any) => ({
            id: t.id,
            title: t.title,
            currentValue: Number(t.currentValue ?? t.current_value),
            goalValue: Number(t.goalValue ?? t.goal_value),
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!getToken(),
    staleTime: 30 * 1000,
  });
}

export function useAddTarget() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ title, currentValue, goalValue }: { title: string; currentValue: number; goalValue: number }) => {
      await apiFetch("/targets", {
        method: "POST",
        body: JSON.stringify({
          title,
          current_value: Number(currentValue),
          goal_value: Number(goalValue),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets", principalKey] });
    },
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ id, title, currentValue, goalValue }: { id: number; title: string; currentValue: number; goalValue: number }) => {
      await apiFetch(`/targets/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          title,
          current_value: Number(currentValue),
          goal_value: Number(goalValue),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets", principalKey] });
    },
  });
}

export function useDeleteTarget() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/targets/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targets", principalKey] });
    },
  });
}

// ─── User Settings ────────────────────────────────────────────────────────────

export function useGetUserSettings() {
  return useQuery<UserSettings | null>({
    queryKey: ["userSettings", getUserId()],
    queryFn: async () => {
      if (!getToken()) return null;
      try {
        const data = await apiFetch("/settings");
        if (data) {
          return {
            backgroundType: (data.backgroundType || data.background_type) as BackgroundType,
            backgroundValue: data.backgroundValue || data.background_value,
          };
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!getToken(),
    staleTime: 60 * 1000,
  });
}

export function useSetUserSettings() {
  const queryClient = useQueryClient();
  const principalKey = getUserId();
  return useMutation({
    mutationFn: async ({ backgroundType, backgroundValue }: { backgroundType: BackgroundType; backgroundValue: string }) => {
      await apiFetch("/settings", {
        method: "POST",
        body: JSON.stringify({
          backgroundType: backgroundType,
          backgroundValue: backgroundValue,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userSettings", principalKey] });
    },
  });
}

// ─── Assistant Chat ─────────────────────────────────────────────────────────

export function useChat() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, Error, { prompt: string; type?: "explorer" | "mentor"; context?: Record<string, any>; conversationHistory?: any[] }>({
    mutationFn: async ({ prompt, type, context, conversationHistory }) => {
      const res = await apiFetch("/assistant-query", {
        method: "POST",
        body: JSON.stringify({ prompt, type, context, conversationHistory }),
      });
      return { message: res.response };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-messages"] });
    }
  });
}

export function useDeleteAssistantMessages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiFetch("/assistant-messages", { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-messages"] });
      toast.success("Chat history cleared");
    },
  });
}

export function useAssistantMessages() {
  return useQuery<any[]>({
    queryKey: ["assistant-messages"],
    queryFn: async () => {
      return apiFetch("/assistant-messages");
    },
    staleTime: 0,
  });
}

export function useSaveAssistantMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ role, text }: { role: string; text: string }) => {
      await apiFetch("/assistant-messages", {
        method: "POST",
        body: JSON.stringify({ role, text }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assistant-messages"] });
    },
  });
}
