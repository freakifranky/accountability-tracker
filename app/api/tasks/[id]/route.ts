import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getTaskById, updateTask, deleteTask, getTasksByGoalId } from "@/lib/db/tasks";
import { upsertCheckin } from "@/lib/db/checkins";
import { getNotificationSettings } from "@/lib/db/push";
import type { Task } from "@/lib/types";

// Returns true if completing this task should trigger an auto check-in.
// Backlog items (no due date, no recurrence) are excluded.
function shouldTriggerCheckin(task: Task): boolean {
  return task.recurrence !== "none" || task.dueDate !== null;
}

// Build the check-in note from all tasks completed today for a goal.
function buildCheckinNote(tasks: Task[], todayStr: string, tz: string): string | null {
  const completedToday = tasks.filter((t) => {
    if (!t.completed || !t.completedAt) return false;
    const localDate = format(
      new Date(new Date(t.completedAt).toLocaleString("en-US", { timeZone: tz })),
      "yyyy-MM-dd"
    );
    return localDate === todayStr;
  });
  if (completedToday.length === 0) return null;
  return `Completed: ${completedToday.map((t) => t.title).join(", ")}`;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskById(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const updated = await updateTask(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Auto check-in side effect: only when completed status changed and task has a goal
  const completedChanged = "completed" in body;
  if (completedChanged && updated.goalId && shouldTriggerCheckin(updated)) {
    const settings = await getNotificationSettings();
    const tz = settings.timezone ?? "UTC";
    let localNow: Date;
    try {
      localNow = new Date(new Date().toLocaleString("en-US", { timeZone: tz }));
    } catch {
      localNow = new Date();
    }
    const todayStr = format(localNow, "yyyy-MM-dd");

    const goalTasks = await getTasksByGoalId(updated.goalId);

    if (body.completed === true) {
      // Include the just-updated task in the note (it has completedAt set now)
      const note = buildCheckinNote(goalTasks, todayStr, tz);
      await upsertCheckin({ goalId: updated.goalId, date: todayStr, completed: true, note: note ?? undefined });
    } else {
      // Un-ticked: check if any other tasks remain completed today
      const otherCompletedToday = goalTasks.filter((t) => {
        if (t.id === updated.id || !t.completed || !t.completedAt) return false;
        const localDate = format(
          new Date(new Date(t.completedAt).toLocaleString("en-US", { timeZone: tz })),
          "yyyy-MM-dd"
        );
        return localDate === todayStr;
      });

      if (otherCompletedToday.length > 0) {
        // Still have other completions today — keep checked in, update note
        const note = `Completed: ${otherCompletedToday.map((t) => t.title).join(", ")}`;
        await upsertCheckin({ goalId: updated.goalId, date: todayStr, completed: true, note });
      } else {
        // Nothing left completed today — un-check the goal
        await upsertCheckin({ goalId: updated.goalId, date: todayStr, completed: false });
      }
    }
  }

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = await deleteTask(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
