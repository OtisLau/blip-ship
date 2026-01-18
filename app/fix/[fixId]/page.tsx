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
    <Suspense fallback={<FixApprovalSkeleton />}>
      <FixApprovalContent fixId={fixId} initialAction={action} />
    </Suspense>
  );
}
