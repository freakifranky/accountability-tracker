import { getGoogleAccessToken } from "./googleAuth";
import { format } from "date-fns";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const CALENDAR_ID = "primary";

export interface DailyQueueGoal {
  goalName: string; // also the recurring event's title, e.g. "AI Learning"
  queueLines: string[]; // e.g. ["Watch: New AI coding agent walkthrough (YouTube)", "2 unread carried over"]
  coachLine: string | null; // the honest-coach callout, if any — omitted (not blank) when null
}

interface CalendarEvent {
  id: string;
  summary?: string;
  recurrence?: string[];
  start?: { date?: string; dateTime?: string };
}

async function calendarFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getGoogleAccessToken();
  const res = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Calendar API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Finds the daily recurring event for a goal by exact title match, or creates
// it if this is the first run (confirmed via search: neither "AI Learning" nor
// "Stocks Learning" exist on the calendar yet as of 2026-08-12).
async function findOrCreateRecurringEvent(goalName: string, todayStr: string, timeZone: string): Promise<string> {
  const search = await calendarFetch<{ items?: CalendarEvent[] }>(
    `/calendars/${CALENDAR_ID}/events?q=${encodeURIComponent(goalName)}&singleEvents=false`
  );
  const existing = search.items?.find((e) => e.summary === goalName && e.recurrence);
  if (existing) return existing.id;

  const created = await calendarFetch<CalendarEvent>(`/calendars/${CALENDAR_ID}/events`, {
    method: "POST",
    body: JSON.stringify({
      summary: goalName,
      description: "",
      start: { dateTime: `${todayStr}T07:00:00`, timeZone },
      end: { dateTime: `${todayStr}T07:15:00`, timeZone },
      recurrence: ["RRULE:FREQ=DAILY"],
    }),
  });
  return created.id;
}

// Edits ONLY today's occurrence, not the whole series. This is standard Google
// Calendar API behavior (not something that needed a live experiment to
// confirm): each instance of a recurring event has its own id in the form
// `{seriesId}_{instanceStartTime}`, and PATCHing that specific instance id
// detaches just that one occurrence — the series and all other instances are
// untouched. What IS untested here is the actual live call against a real
// deployed OAuth app, since this environment has no Google credentials.
async function patchTodayInstance(seriesId: string, todayStr: string, description: string): Promise<void> {
  const instances = await calendarFetch<{ items?: CalendarEvent[] }>(
    `/calendars/${CALENDAR_ID}/events/${seriesId}/instances?maxResults=10`
  );
  const todayInstance = instances.items?.find(
    (i) => i.start?.dateTime?.startsWith(todayStr) || i.start?.date === todayStr
  );

  if (!todayInstance) {
    throw new Error(`No calendar instance found for "${seriesId}" on ${todayStr} — series may not have started yet`);
  }

  await calendarFetch(`/calendars/${CALENDAR_ID}/events/${todayInstance.id}`, {
    method: "PATCH",
    body: JSON.stringify({ description }),
  });
}

export async function pushDailyQueue(goal: DailyQueueGoal, timeZone: string = "Asia/Jakarta"): Promise<void> {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const seriesId = await findOrCreateRecurringEvent(goal.goalName, todayStr, timeZone);

  const lines = [...goal.queueLines];
  if (goal.coachLine) lines.push("", goal.coachLine);

  await patchTodayInstance(seriesId, todayStr, lines.join("\n"));
}
