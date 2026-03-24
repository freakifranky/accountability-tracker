import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="font-bold text-gray-900 text-lg tracking-tight">
          Accountability Tracker
        </Link>
        <Link
          href="/goals/new"
          className="bg-gray-900 text-white text-sm font-medium px-4 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
        >
          + New Goal
        </Link>
      </div>
    </nav>
  );
}
