import clsx from "clsx";

interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  showValue?: boolean;
  size?: "sm" | "md";
}

export default function ProgressBar({ value, label, showValue = true, size = "sm" }: ProgressBarProps) {
  const color =
    value >= 75 ? "bg-green-500" : value >= 50 ? "bg-yellow-400" : "bg-[#e44332]";

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          {label && <span className="font-medium text-gray-500">{label}</span>}
          {showValue && <span className="font-semibold text-gray-700">{value}%</span>}
        </div>
      )}
      <div className={clsx("w-full rounded-full bg-gray-100", size === "md" ? "h-2" : "h-1.5")}>
        <div
          className={clsx("rounded-full transition-all duration-500", color, size === "md" ? "h-2" : "h-1.5")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
