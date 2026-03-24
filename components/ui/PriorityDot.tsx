import clsx from "clsx";
import type { Priority } from "@/lib/types";

const PRIORITY_COLORS: Record<Priority, string> = {
  1: "border-[#e44332] text-[#e44332]",
  2: "border-orange-400 text-orange-400",
  3: "border-blue-400 text-blue-400",
  4: "border-gray-300 text-gray-300",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "None",
};

interface PriorityDotProps {
  priority: Priority;
  size?: "sm" | "md";
}

export default function PriorityDot({ priority, size = "md" }: PriorityDotProps) {
  return (
    <span
      title={`Priority: ${PRIORITY_LABELS[priority]}`}
      className={clsx(
        "rounded-full border-2 shrink-0 flex items-center justify-center",
        PRIORITY_COLORS[priority],
        size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"
      )}
    />
  );
}
