/**
 * Branch Preview Page
 *
 * Side-by-side slider comparison of a fix branch against current main.
 * Uses the BranchPreviewSlider component for the comparison UI.
 */

import Link from 'next/link';
import { getBranchCommitInfo } from '@/lib/git-service';
import { BranchPreviewSlider } from '@/components/dev/BranchPreviewSlider';

export const dynamic = 'force-dynamic';

interface BranchPreviewPageProps {
  params: Promise<{ branchName: string }>;
}

export default async function BranchPreviewPage({ params }: BranchPreviewPageProps) {
  const { branchName } = await params;
  const decodedBranchName = decodeURIComponent(branchName);

  let commitInfo = null;
  try {
    commitInfo = await getBranchCommitInfo(decodedBranchName);
  } catch (error) {
    console.error('Failed to get commit info:', error);
  }

  // URLs for the before/after iframes
  const beforeUrl = '/store?mode=live';
  const afterUrl = `/store?mode=branch&branch=${encodeURIComponent(decodedBranchName)}`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dev/preview"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm">Back</span>
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <div>
            <h1 className="font-mono text-sm font-medium text-gray-900">{decodedBranchName}</h1>
            {commitInfo && (
              <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">
                {commitInfo.message}
              </p>
            )}
          </div>
        </div>

        {/* Commit Info */}
        {commitInfo && (
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
              {commitInfo.hash.slice(0, 7)}
            </span>
            <span>{formatDate(commitInfo.date)}</span>
          </div>
        )}
      </header>

      {/* Main Comparison Area */}
      <main className="flex-1 p-4 relative">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden h-full">
          <BranchPreviewSlider
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            beforeLabel="Current (main)"
            afterLabel={`Branch (${decodedBranchName.replace('fix/', '')})`}
          />
        </div>
      </main>
    </div>
  );
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}
