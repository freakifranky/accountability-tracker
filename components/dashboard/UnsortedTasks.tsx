"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Task, Goal } from "@/lib/types";
import TaskItem from "@/components/goals/TaskItem";
import { apiFetch } from "@/lib/apiFetch";

interface UnsortedTasksProps {
  tasks: Task[];
  goals: Goal[];
}

const NEW_GOAL = "__new__";

function AssignControl({ task, goals, onAssigned }: { task: Task; goals: Goal[]; onAssigned: () => void }) {
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAction, setNewAction] = useState("");
  const [loading, setLoading] = useState(false);

  async function assignToGoal(goalId: string) {
    setLoading(true);
    try {
      await apiFetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      });
      onAssigned();
    } catch {
      // apiFetch already surfaced a toast
      setLoading(false);
    }
  }

  async function createAndAssign() {
    if (!newName.trim() || !newAction.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), dailyAction: newAction.trim() }),
      });
      const goal: Goal = await res.json();
      await assignToGoal(goal.id);
    } catch {
      // apiFetch already surfaced a toast
      setLoading(false);
    }
  }

  if (creatingGoal) {
    return (
      <div className="flex flex-col gap-1.5 mt-1.5 ml-7 mb-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Goal name"
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-400"
        />
        <input
          value={newAction}
          onChange={(e) => setNewAction(e.target.value)}
          placeholder="Daily action"
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-gray-400"
        />
        <div className="flex gap-2">
          <button
            onClick={createAndAssign}
            disabled={loading || !newName.trim() || !newAction.trim()}
            className="text-xs bg-[#e44332] text-white font-medium px-2.5 py-1.5 rounded-lg hover:bg-[#c0392b] disabled:opacity-50 transition-colors"
          >
            {loading ? "Creating…" : "Create & assign"}
          </button>
          <button
            onClick={() => setCreatingGoal(false)}
            disabled={loading}
            className="text-xs text-gray-400 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 ml-7 mb-2">
      <select
        disabled={loading}
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          if (!value) return;
          if (value === NEW_GOAL) setCreatingGoal(true);
          else assignToGoal(value);
        }}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-500 outline-none focus:border-gray-400"
      >
        <option value="" disabled>
          Assign to goal…
        </option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
        <option value={NEW_GOAL}>+ New goal</option>
      </select>
    </div>
  );
}

export default function UnsortedTasks({ tasks, goals }: UnsortedTasksProps) {
  const router = useRouter();
  if (tasks.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Unsorted ({tasks.length})</h2>
      </div>
      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 px-4 py-2">
        {tasks.map((t) => (
          <div key={t.id}>
            <TaskItem task={t} />
            <AssignControl task={t} goals={goals} onAssigned={() => router.refresh()} />
          </div>
        ))}
      </div>
    </div>
  );
}
