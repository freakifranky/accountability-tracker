"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Goal } from "@/lib/types";

interface GoalFormProps {
  goal?: Goal; // if provided, edit mode
}

export default function GoalForm({ goal }: GoalFormProps) {
  const router = useRouter();
  const [name, setName] = useState(goal?.name ?? "");
  const [dailyAction, setDailyAction] = useState(goal?.dailyAction ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Goal name is required."); return; }
    if (!dailyAction.trim()) { setError("Daily action is required."); return; }

    setSaving(true);
    try {
      const url = goal ? `/api/goals/${goal.id}` : "/api/goals";
      const method = goal ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), dailyAction: dailyAction.trim(), description: description.trim() || undefined, deadline: deadline || undefined }),
      });
      if (!res.ok) {
        let message = "Failed to save goal";
        try {
          const data = await res.json();
          message = data.error ?? message;
        } catch {}
        throw new Error(message);
      }
      const saved = await res.json();
      router.push(goal ? `/goals/${goal.id}` : `/goals/${saved.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Goal name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Exercise daily"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Daily action <span className="text-red-500">*</span>
        </label>
        <textarea
          value={dailyAction}
          onChange={(e) => setDailyAction(e.target.value)}
          rows={2}
          placeholder="What does 'done' look like today? e.g. 30 min workout completed"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">Be specific — this is what you'll check off each day.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Optional notes about this goal"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-[#e44332] text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-[#c0392b] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : goal ? "Save changes" : "Create goal"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
