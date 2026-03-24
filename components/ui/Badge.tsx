import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "yellow" | "red" | "gray";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-gray-100 text-gray-700": variant === "default",
          "bg-green-100 text-green-700": variant === "green",
          "bg-yellow-100 text-yellow-700": variant === "yellow",
          "bg-red-100 text-red-700": variant === "red",
          "bg-gray-200 text-gray-500": variant === "gray",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
