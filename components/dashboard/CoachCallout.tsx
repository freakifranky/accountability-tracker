// Renders nothing when there's nothing to say — silence reads as "nothing
// happened," not "you failed" (design review decision for the zero-capture
// and no-honesty-flag states alike).
export default function CoachCallout({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 mb-4">
      {messages.map((message, i) => (
        <p key={i} className={`text-sm font-medium text-orange-700 ${i > 0 ? "mt-1.5" : ""}`}>
          {message}
        </p>
      ))}
    </div>
  );
}
