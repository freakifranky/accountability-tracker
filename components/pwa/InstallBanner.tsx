"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== "undefined" && localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !promptEvent) return null;

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-3 mb-4">
      <span className="text-2xl leading-none shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">Install Commit on your phone</p>
        <p className="text-xs text-gray-400 mt-0.5">Open it like a native app — no browser bar</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstall}
          className="text-xs font-medium bg-[#e44332] text-white px-3 py-1.5 rounded-lg hover:bg-[#c0392b] transition-colors"
        >
          Add to Home Screen
        </button>
        <button
          onClick={handleDismiss}
          className="text-gray-300 hover:text-gray-500 text-lg leading-none transition-colors"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
