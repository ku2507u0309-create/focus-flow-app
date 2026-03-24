import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export type ReminderId = bigint;
export interface WeekTask {
    id: TaskId;
    title: string;
    createdAt: Time;
    description: string;
    isComplete: boolean;
}
export interface Target {
    title: string;
    goalValue: bigint;
    currentValue: bigint;
}
export interface ScheduleItem {
    id: bigint;
    title: string;
    duration: bigint;
}
export interface Reminder {
    id: ReminderId;
    title: string;
    isBirthday: boolean;
    isTriggered: boolean;
    dateTime: Time;
}
export type TaskId = bigint;
export interface UserSettings {
    backgroundType: BackgroundType;
    backgroundValue: string;
}
export interface UserProfile {
    username: string;
    email: string;
}
export enum BackgroundType {
    color = "color",
    image = "image"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addReminder(title: string, dateTime: Time, isBirthday: boolean): Promise<ReminderId>;
    addScheduleItem(title: string, duration: bigint): Promise<bigint>;
    addTask(title: string, description: string): Promise<TaskId>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteTask(taskId: TaskId): Promise<void>;
    exportUserData(): Promise<{
        tasks: Array<WeekTask>;
        scheduleTemplate: Array<ScheduleItem>;
        target?: Target;
        settings?: UserSettings;
        reminders: Array<Reminder>;
    }>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getReminders(): Promise<Array<Reminder>>;
    getScheduleTemplate(): Promise<Array<ScheduleItem>>;
    getTarget(): Promise<Target | null>;
    getTasks(): Promise<Array<WeekTask>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getUserSettings(): Promise<UserSettings | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setTarget(title: string, currentValue: bigint, goalValue: bigint): Promise<void>;
    setUserSettings(backgroundType: BackgroundType, backgroundValue: string): Promise<void>;
    updateTask(taskId: TaskId, title: string, description: string, isComplete: boolean): Promise<void>;
}
