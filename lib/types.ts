export interface Goal {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null; // YYYY-MM-DD
  dailyAction: string;
  createdAt: string; // ISO timestamp
  archivedAt: string | null; // ISO timestamp
}

export interface CheckIn {
  id: string;
  goalId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  note: string | null;
  createdAt: string; // ISO timestamp
}

export type Priority = 1 | 2 | 3 | 4; // 1=urgent, 2=high, 3=medium, 4=none

export type RecurrenceRule = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'monthly' | 'custom';

export type TaskSource = "manual" | "chrome-tab";
export type TaskContentType = "article" | "video";

export interface Task {
  id: string;
  goalId: string | null; // null = standalone task
  title: string;
  dueDate: string | null; // YYYY-MM-DD (deadline for recurring, due date for one-off)
  priority: Priority;
  recurrence: RecurrenceRule;
  recurrenceDays: number[] | null; // [0–6] when recurrence === 'custom'; 0=Sun…6=Sat
  completed: boolean;
  completedAt: string | null; // ISO timestamp of last completion
  completionNote: string | null; // optional one-liner from last check-in
  completionMood: number | null; // 1–5 mood/energy score from last check-in
  createdAt: string; // ISO timestamp
  source: TaskSource; // "manual" = created via the app UI, "chrome-tab" = auto-captured
  sourceUrl: string | null; // the captured URL, null for manual tasks
  sourceId: string | null; // dedup key (normalized URL) — prevents re-capturing the same tab/video twice
  contentType: TaskContentType | null; // "video" for youtube.com URLs, "article" for everything else captured, null for manual
}

export interface GoalWithStats extends Goal {
  streak: number;
  commitmentRate: number;
  todayCheckin: CheckIn | null;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  deadline?: string;
  dailyAction: string;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  deadline?: string;
  dailyAction?: string;
}

export interface UpsertCheckinInput {
  goalId: string;
  date: string;
  completed: boolean;
  note?: string;
}

export interface PushSubscriptionRecord {
  id: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  createdAt: string;
}

export interface NotificationSettings {
  enabled: boolean;
  reminderTime: string; // "HH:MM" in user's local timezone
  days: number[]; // 0=Sun…6=Sat, empty=all days
  lastNotifiedDate: string | null; // "YYYY-MM-DD" in user's local timezone
  timezone: string | null; // IANA timezone string e.g. "Asia/Bangkok", null = UTC
}

export type NotificationSchedule = 'daily' | 'weekdays' | 'weekends' | 'custom';

export interface GoalNotificationSettings {
  goalId: string;
  enabled: boolean;
  reminderTime: string; // "HH:MM" in user's local timezone
  schedule: NotificationSchedule; // preset
  days: number[]; // 0=Sun…6=Sat, used when schedule='custom'
  message: string | null; // null = auto-generated from goal.dailyAction
  lastNotifiedDate: string | null; // "YYYY-MM-DD" for per-goal dedup
}

export interface CreateTaskInput {
  goalId?: string;
  title: string;
  dueDate?: string;
  priority?: Priority;
  recurrence?: RecurrenceRule;
  recurrenceDays?: number[];
  source?: TaskSource; // defaults to "manual"
  sourceUrl?: string;
  sourceId?: string;
  contentType?: TaskContentType;
}

export interface UpdateTaskInput {
  goalId?: string | null; // move a standalone task into a goal, or null to unassign
  title?: string;
  dueDate?: string;
  priority?: Priority;
  recurrence?: RecurrenceRule;
  recurrenceDays?: number[] | null;
  completed?: boolean;
  completionNote?: string | null;
  completionMood?: number | null;
}
