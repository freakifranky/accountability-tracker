import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-5xl mb-4">🔍</p>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Page not found</h2>
      <p className="text-gray-500 text-sm mb-6">The goal or page you're looking for doesn't exist.</p>
      <Link href="/dashboard" className="text-sm text-gray-600 underline hover:text-gray-900">
        Back to dashboard
      </Link>
    </div>
  );
}
