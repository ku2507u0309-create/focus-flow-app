export interface AssistantMessage {
  id: string | bigint;
  role: "user" | "assistant";
  text: string;
  createdAt: number | bigint;
}

const STORAGE_KEY_PREFIX = "focusflow_assistant_";

function getEnv(key: string, fallback = ""): string {
  return (import.meta.env[key] as string) ?? fallback;
}

export function isAssistantEnabled(): boolean {
  // Assistant is enabled if user is logged in (backend has Gemini API key)
  return Boolean(localStorage.getItem("authToken"));
}

export function getAssistantStorageKey(userId: string) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function loadAssistantMessages(userId: string): AssistantMessage[] {
  try {
    const raw = localStorage.getItem(getAssistantStorageKey(userId));
    return raw ? (JSON.parse(raw) as AssistantMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveAssistantMessages(userId: string, messages: AssistantMessage[]) {
  try {
    localStorage.setItem(getAssistantStorageKey(userId), JSON.stringify(messages));
  } catch {
    // ignore write failures
  }
}

function makeMessage(role: "user" | "assistant", text: string): AssistantMessage {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    role,
    text,
    createdAt: Date.now(),
  };
}

export async function sendAssistantPrompt(
  userId: string,
  prompt: string,
  context?: AssistantContext,
): Promise<AssistantMessage> {
  const userMsg = makeMessage("user", prompt);
  const existing = loadAssistantMessages(userId);
  const pending = [...existing, userMsg];
  saveAssistantMessages(userId, pending);
  
  const responseText = await queryAssistant(prompt, existing, context);
  const assistantMsg = makeMessage("assistant", responseText);
  saveAssistantMessages(userId, [...pending, assistantMsg]);

  return assistantMsg;
}

export function appendAssistantMessage(userId: string, text: string): AssistantMessage {
  const existing = loadAssistantMessages(userId);
  const assistantMsg = makeMessage("assistant", text);
  saveAssistantMessages(userId, [...existing, assistantMsg]);

  // Notify UI listeners (e.g. AssistantPanel) so they can refresh immediately
  try {
    const event = new CustomEvent("assistantMessageAdded", {
      detail: { userId, message: assistantMsg },
    });
    window.dispatchEvent(event);
  } catch {
    // ignore if custom events are not supported
  }

  return assistantMsg;
}

const DAILY_CHECKIN_KEY_PREFIX = "focusflow_daily_checkin_";

export function getLastDailyCheckin(userId: string): string | null {
  try {
    return localStorage.getItem(`${DAILY_CHECKIN_KEY_PREFIX}${userId}`);
  } catch {
    return null;
  }
}

export function setLastDailyCheckin(userId: string, dateStr: string): void {
  try {
    localStorage.setItem(`${DAILY_CHECKIN_KEY_PREFIX}${userId}`, dateStr);
  } catch {
    // ignore
  }
}

export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export interface AssistantContext {
  username?: string;
  tasks?: Array<{ title: string; isComplete: boolean }>;
  upcomingReminders?: Array<{ title: string }>;
  focusAreas?: string[];
}

export async function queryAssistant(
  prompt: string,
  conversationHistory?: AssistantMessage[],
  context?: AssistantContext,
): Promise<string> {
  const apiUrl = import.meta.env.PROD ? "/api" : "http://localhost:8000/api";

  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Not authenticated");
  }

  // Call backend endpoint which proxies to Google Gemini
  const response = await fetch(`${apiUrl}/assistant-query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({
      prompt,
      context,
      conversationHistory,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Assistant request failed (${response.status}): ${errorText || response.statusText}`,
    );
  }

  const json = (await response.json()) as {
    response?: string;
  };

  const output = json.response;
  if (!output) {
    throw new Error("Assistant responded with an unexpected payload.");
  }

  return output.trim();
}
