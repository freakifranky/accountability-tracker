import { format, parseISO } from "date-fns";
import type { CheckIn } from "@/lib/types";

interface CheckInHistoryProps {
  checkins: CheckIn[];
}

export default function CheckInHistory({ checkins }: CheckInHistoryProps) {
  if (checkins.length === 0) {
    return <p className="text-sm text-gray-400 text-center py-8">No check-ins yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {checkins.map((c) => (
        <li key={c.id} className="flex items-start gap-3 text-sm">
          <span
            className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
              c.completed ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
            }`}
          >
            {c.completed ? "✓" : "–"}
          </span>
          <div>
            <span className="font-medium text-gray-700">
              {format(parseISO(c.date), "EEE, MMM d, yyyy")}
            </span>
            {c.note && (
              <div className="mt-1 space-y-0.5">
                {c.note.split("\n").map((line, i) => (
                  <p key={i} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
