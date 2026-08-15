"use client";

import { useEffect, useState } from "react";
import { API_ERROR_EVENT } from "@/lib/apiFetch";

// Mounted once in the root layout. Listens for apiFetch() failures so a failed
// write (network error, expired secret, server error) is always visible instead
// of silently doing nothing — see lib/apiFetch.ts for why this exists.
export default function ErrorToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleApiError(e: Event) {
      const detail = (e as CustomEvent<string>).detail;
      setMessage(detail);
    }
    window.addEventListener(API_ERROR_EVENT, handleApiError);
    return () => window.removeEventListener(API_ERROR_EVENT, handleApiError);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] sm:w-auto">
      <div className="bg-gray-900 text-white text-sm rounded-xl px-4 py-3 shadow-lg flex items-start gap-2">
        <span className="text-red-400">⚠</span>
        <span className="flex-1">{message}</span>
        <button
          onClick={() => setMessage(null)}
          className="text-gray-400 hover:text-white text-xs shrink-0"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
