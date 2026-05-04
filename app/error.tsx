'use client';

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="p-6 space-y-3">
      <p className="font-bold text-red-600">App error — send this to Sandy:</p>
      <pre className="text-xs bg-gray-100 rounded p-3 whitespace-pre-wrap break-all">
        {error?.message ?? 'unknown'}
        {'\n\n'}
        {error?.stack ?? ''}
      </pre>
    </div>
  );
}
