import { notFound } from "next/navigation";
import { getGoalById } from "@/lib/db/goals";
import GoalForm from "@/components/goals/GoalForm";

export default async function EditGoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const goal = await getGoalById(id);
  if (!goal) notFound();

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Goal</h1>
      <GoalForm goal={goal} />
    </div>
  );
}