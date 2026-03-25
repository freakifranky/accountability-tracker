import NotificationSettings from "@/components/push/NotificationSettings";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-20 sm:pb-6">
      <h1 className="text-lg font-bold text-gray-900 mb-5">Settings</h1>

      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Notifications</h2>
        <NotificationSettings />
      </div>
    </div>
  );
}
