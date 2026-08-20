'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-6xl font-black text-teal-dark mb-4">404</h1>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-8">The page you are looking for does not exist or has been moved.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-teal-dark text-white font-bold rounded-xl hover:bg-teal-bright transition-all text-sm"
      >
        Go Home
      </Link>
    </div>
  );
}
