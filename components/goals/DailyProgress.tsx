import { format, parseISO } from "date-fns";

interface DailyProgressEntry {
  date: string;          // YYYY-MM-DD
  checkedIn: boolean;
  tasksCompleted: string[];
}

interface DailyProgressProps {
  entries: DailyProgressEntry[];
}

export default function DailyProgress({ entries }: DailyProgressProps) {
  const hasAnyActivity = entries.some((e) => e.checkedIn || e.tasksCompleted.length > 0);

  if (!hasAnyActivity) {
    return (
      <p className="text-sm text-gray-300 py-3 text-center">
        No activity yet — complete a task to start your streak.
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {entries.map((entry) => {
        const hasActivity = entry.checkedIn || entry.tasksCompleted.length > 0;
        if (!hasActivity) return null;

        return (
          <div key={entry.date} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
            {/* Status dot */}
            <div className="mt-0.5 shrink-0">
              <span
                className={`block w-2.5 h-2.5 rounded-full mt-0.5 ${
                  entry.checkedIn ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            </div>
            {/* Date + tasks */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-500">
                {format(parseISO(entry.date), "EEE, MMM d")}
              </p>
              {entry.tasksCompleted.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {entry.tasksCompleted.join(" · ")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
