import { Suspense } from 'react';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { DemoFlow } from '@/components/dashboard/DemoFlow';

// Server Component - streams immediately while DashboardContent loads (rule: async-suspense-boundaries)
export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header renders immediately */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Blip Ship Dashboard</h1>
            <p className="text-gray-400 text-sm">Real-time analytics &amp; heatmaps</p>
          </div>
          <a
            href="/store"
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            View Store
          </a>
        </div>
      </header>

      {/* Demo Flow Section */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <DemoFlow />
      </div>

      {/* Analytics Content streams in with Suspense */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </main>
  );
}
