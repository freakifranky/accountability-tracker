"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "Today", icon: "⬜" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/progress", label: "Progress", icon: "📊" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-bold text-[#e44332] text-lg tracking-tight">
            Commit
          </Link>
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "text-sm px-3 py-1.5 rounded-lg transition-colors font-medium",
                  pathname === item.href
                    ? "bg-red-50 text-[#e44332]"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <Link
          href="/goals/new"
          className="bg-[#e44332] text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-[#c0392b] transition-colors"
        >
          + New Goal
        </Link>
      </div>

      {/* Mobile bottom nav */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex-1 flex flex-col items-center py-2.5 text-xs gap-0.5 transition-colors",
              pathname === item.href ? "text-[#e44332]" : "text-gray-400"
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
