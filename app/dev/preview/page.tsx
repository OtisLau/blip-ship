/**
 * Dev Preview Dashboard
 *
 * Lists all fix/* branches with preview capability.
 * Allows comparing fix branches against the current main branch.
 */

import Link from 'next/link';
import { listFixBranches } from '@/lib/git-service';

export const dynamic = 'force-dynamic';

export default async function DevPreviewPage() {
  const branches = await listFixBranches();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src="/boat.png" alt="Blip Ship logo" className="w-8 h-8" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dev Branch Preview</h1>
              <p className="text-sm text-gray-500">
                Preview fix branches side-by-side with current main
              </p>
            </div>
          </div>
          <Link
            href="/store"
            className="text-sm text-gray-600 hover:text-gray-900 transition"
          >
            View Store
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {branches.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="text-gray-400 text-5xl mb-4">🌿</div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No Fix Branches Found</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              There are no remote fix branches to preview. Trigger the CRO fix flow to create
              some fix branches.
            </p>
            <div className="mt-6">
              <Link
                href="/api/trigger-fix-flow"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-gray-800 transition"
              >
                Trigger Fix Flow
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {branches.length} fix branch{branches.length !== 1 ? 'es' : ''} found
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {branches.map((branch) => (
                  <li key={branch.name}>
                    <Link
                      href={`/dev/preview/${encodeURIComponent(branch.name)}`}
                      className="block px-6 py-4 hover:bg-gray-50 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-medium text-gray-900 truncate">
                              {branch.name}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              fix
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-500 truncate">
                            {branch.lastCommitMessage || 'No commit message'}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            {formatDate(branch.lastCommitDate)}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="inline-flex items-center gap-1 text-sm text-gray-500 group-hover:text-gray-900 transition">
                            Preview
                            <svg
                              className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown date';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return dateString;
  }
}
