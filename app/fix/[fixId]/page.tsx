import { Suspense } from 'react';
import { FixApprovalContent } from '@/components/fix/FixApprovalContent';
import { FixApprovalSkeleton } from '@/components/fix/FixApprovalSkeleton';

interface FixPageProps {
  params: Promise<{ fixId: string }>;
  searchParams: Promise<{ action?: string }>;
}

export default async function FixPage({ params, searchParams }: FixPageProps) {
  const { fixId } = await params;
  const { action } = await searchParams;

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fix Review</h1>
            <p className="text-gray-400 text-sm">
              Review and approve CRO optimization
            </p>
          </div>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition text-sm"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <Suspense fallback={<FixApprovalSkeleton />}>
        <FixApprovalContent fixId={fixId} initialAction={action} />
      </Suspense>
    </main>
  );
}
