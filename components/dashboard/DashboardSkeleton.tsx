// Skeleton component for dashboard loading state (rule: rendering-hoist-jsx)
// Hoisted as static JSX since it never changes
const SkeletonCard = (
  <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
    <div className="h-4 bg-gray-800 rounded w-1/3 mb-4" />
    <div className="h-8 bg-gray-800 rounded w-1/2" />
  </div>
);

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SkeletonCard}
        {SkeletonCard}
        {SkeletonCard}
        {SkeletonCard}
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Heatmap Skeleton */}
        <div className="lg:col-span-2">
          <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-1/4 mb-4" />
            <div className="h-64 bg-gray-800 rounded" />
          </div>
        </div>

        {/* Right Column Skeleton */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-1/3 mb-4" />
            <div className="h-32 bg-gray-800 rounded" />
          </div>
          <div className="bg-gray-900 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-800 rounded w-1/3 mb-4" />
            <div className="h-32 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
