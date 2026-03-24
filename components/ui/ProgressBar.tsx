import clsx from "clsx";

interface ProgressBarProps {
  value: number; // 0–100
  label?: string;
  showValue?: boolean;
}

export default function ProgressBar({ value, label, showValue = true }: ProgressBarProps) {
  const color =
    value >= 75 ? "bg-green-500" : value >= 50 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          {label && <span>{label}</span>}
          {showValue && <span>{value}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-gray-200">
        <div
          className={clsx("h-1.5 rounded-full transition-all", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
