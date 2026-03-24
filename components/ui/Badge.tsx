import clsx from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "green" | "yellow" | "red" | "gray" | "blue";
  className?: string;
}

export default function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        {
          "bg-gray-100 text-gray-600": variant === "default",
          "bg-green-100 text-green-700": variant === "green",
          "bg-yellow-100 text-yellow-700": variant === "yellow",
          "bg-red-100 text-[#e44332]": variant === "red",
          "bg-gray-100 text-gray-400": variant === "gray",
          "bg-blue-100 text-blue-700": variant === "blue",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
