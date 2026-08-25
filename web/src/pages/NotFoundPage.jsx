import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-100 text-center">
      <span className="text-3xl" aria-hidden="true">🧭</span>
      <h1 className="text-lg font-semibold text-slate-900">Page not found</h1>
      <Link to="/" className="text-sm font-medium text-brand-600 hover:underline">
        Back to Overview
      </Link>
    </div>
  );
}
