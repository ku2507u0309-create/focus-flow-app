import type {
  backendInterface,
  BackgroundType,
  Reminder,
  ScheduleItem,
  Target,
  UserProfile,
  UserSettings,
  WeekTask,
  _CaffeineStorageCreateCertificateResult,
  _CaffeineStorageRefillInformation,
  _CaffeineStorageRefillResult,
} from "../backend";
import { UserRole } from "../backend";

type PrincipalString = string;

const STORAGE_KEY = "caffeine_mock_backend_v1";

interface MockUserData {
  registered: boolean;
  profile?: UserProfile;
  role: UserRole;
  tasks: WeekTask[];
  schedule: ScheduleItem[];
  reminders: Reminder[];
  target?: Target;
  settings?: UserSettings;
  nextTaskId: bigint;
  nextScheduleId: bigint;
  nextReminderId: bigint;
}

interface MockState {
  [principal: string]: MockUserData;
}

function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MockState) : {};
  } catch {
    return {};
  }
}

function saveState(state: MockState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore failures (e.g. storage full)
  }
}

function getUserData(principal: PrincipalString): MockUserData {
  const state = loadState();
  if (!state[principal]) {
    state[principal] = {
      registered: false,
      profile: undefined,
      role: UserRole.user,
      tasks: [],
      schedule: [],
      reminders: [],
      target: undefined,
      settings: undefined,
      nextTaskId: BigInt(1),
      nextScheduleId: BigInt(1),
      nextReminderId: BigInt(1),
    };
    saveState(state);
  }
  return state[principal];
}

function persistUserData(principal: PrincipalString, data: MockUserData) {
  const state = loadState();
  state[principal] = data;
  saveState(state);
}

function normalizePrincipal(principal: string): string {
  return principal.trim();
}

export const mockBackend: backendInterface = {
  // Access control stub
  async _initializeAccessControlWithSecret(_userSecret: string) {
    // No real access control in mock mode.
    // Mark the principal as registered once this is called.
    return;
  },

  async assignCallerUserRole(_user: unknown, role: UserRole) {
    // Called by admin UI; in mock we just set role for the current user.
    // This method is not currently used in the frontend, so it's a no-op.
    return;
  },

  async getCallerUserRole() {
    return UserRole.user;
  },

  async isCallerAdmin() {
    return false;
  },

  async getCallerUserProfile() {
    // The frontend always calls this after creating a deterministic identity.
    // The identity principal string will be contained in the `this` context, but
    // since we don't have that, we rely on the actor's `agent` to provide it.
    // In this mock, the principal is implicitly provided via a global.
    // We'll use a weak global to track it.
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    return user.profile ?? null;
  },

  async getUserProfile(user: { toString: () => string }) {
    const principal = normalizePrincipal(user.toString());
    const userData = getUserData(principal);
    return userData.profile ?? null;
  },

  async saveCallerUserProfile(profile: UserProfile) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    user.profile = profile;
    persistUserData(principal, user);
  },

  async getTasks() {
    const principal = getCurrentPrincipal();
    return getUserData(principal).tasks;
  },

  async addTask(title: string, description: string) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    const task: WeekTask = {
      id: user.nextTaskId,
      title,
      description,
      isComplete: false,
      createdAt: BigInt(Date.now()) * BigInt(1_000_000),
    };
    user.tasks = [...user.tasks, task];
    user.nextTaskId = user.nextTaskId + BigInt(1);
    persistUserData(principal, user);
    return task.id;
  },

  async updateTask(
    taskId: bigint,
    title: string,
    description: string,
    isComplete: boolean,
  ) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    user.tasks = user.tasks.map((t) =>
      t.id === taskId ? { ...t, title, description, isComplete } : t,
    );
    persistUserData(principal, user);
  },

  async deleteTask(taskId: bigint) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    user.tasks = user.tasks.filter((t) => t.id !== taskId);
    persistUserData(principal, user);
  },

  async getScheduleTemplate() {
    const principal = getCurrentPrincipal();
    return getUserData(principal).schedule;
  },

  async addScheduleItem(title: string, duration: bigint) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    const item: ScheduleItem = {
      id: user.nextScheduleId,
      title,
      duration,
    };
    user.schedule = [...user.schedule, item];
    user.nextScheduleId = user.nextScheduleId + BigInt(1);
    persistUserData(principal, user);
    return item.id;
  },

  async getReminders() {
    const principal = getCurrentPrincipal();
    return getUserData(principal).reminders;
  },

  async addReminder(title: string, dateTime: bigint, isBirthday: boolean) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    const reminder: Reminder = {
      id: user.nextReminderId,
      title,
      dateTime,
      isBirthday,
      isTriggered: false,
    };
    user.reminders = [...user.reminders, reminder];
    user.nextReminderId = user.nextReminderId + BigInt(1);
    persistUserData(principal, user);
    return reminder.id;
  },

  async getTarget() {
    const principal = getCurrentPrincipal();
    return getUserData(principal).target ?? null;
  },

  async setTarget(title: string, currentValue: bigint, goalValue: bigint) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    user.target = { title, currentValue, goalValue };
    persistUserData(principal, user);
  },

  async getUserSettings() {
    const principal = getCurrentPrincipal();
    return getUserData(principal).settings ?? null;
  },

  async getAssistantMessages() {
    // In mock mode we don't persist assistant conversation.
    return [];
  },

  async trackUserAction(kind: string, payload: string) {
    // Return a simple motivational response.
    if (kind === "task_completed") {
      return `Nice work completing a task! Keep going.`;
    }
    if (kind === "task_created") {
      return `Great start! You've added a new task: "${payload}". Let's keep the momentum.`;
    }
    if (kind === "journal_saved") {
      return `Thanks for journaling! Reflecting regularly helps build clarity and focus.`;
    }
    return "Got it! Keep up the good work.";
  },

  async setUserSettings(backgroundType: BackgroundType, backgroundValue: string) {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    user.settings = { backgroundType, backgroundValue };
    persistUserData(principal, user);
  },

  async exportUserData() {
    const principal = getCurrentPrincipal();
    const user = getUserData(principal);
    return {
      tasks: user.tasks,
      scheduleTemplate: user.schedule,
      target: user.target,
      settings: user.settings,
      reminders: user.reminders,
    };
  },

  async _caffeineStorageBlobIsLive(_hash: Uint8Array) {
    return false;
  },

  async _caffeineStorageBlobsToDelete() {
    return [];
  },

  async _caffeineStorageConfirmBlobDeletion(_blobs: Array<Uint8Array>) {
    return;
  },

  async _caffeineStorageCreateCertificate(_blobHash: string) {
    return { method: "mock", blob_hash: _blobHash };
  },

  async _caffeineStorageRefillCashier(
    _refillInformation: _CaffeineStorageRefillInformation | null,
  ) {
    return { success: true } as _CaffeineStorageRefillResult;
  },

  async _caffeineStorageUpdateGatewayPrincipals() {
    return;
  },
};

// A small helper to track the currently-acting principal.
// In the real backend, the actor's agent exposes the caller principal.
// In our mock, we store it in a module-scoped variable whenever we create an actor.

let currentPrincipal: string | null = null;

export function setCurrentPrincipal(principal: string) {
  currentPrincipal = normalizePrincipal(principal);
}

function getCurrentPrincipal(): string {
  if (!currentPrincipal) {
    // Fallback to a stable sentinel to avoid throwing.
    return "anonymous";
  }
  return currentPrincipal;
}
