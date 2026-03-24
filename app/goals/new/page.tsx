import GoalForm from "@/components/goals/GoalForm";

export default function NewGoalPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Goal</h1>
      <GoalForm />
    </div>
  );
}
