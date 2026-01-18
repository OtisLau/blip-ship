export function FixApprovalSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 animate-pulse">
      {/* Status Badge Skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-24 bg-gray-800 rounded-full"></div>
        <div className="h-4 w-48 bg-gray-800 rounded"></div>
      </div>

      {/* Summary Card Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="h-6 w-3/4 bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-4 h-24"></div>
          ))}
        </div>
        <div className="bg-gray-700/50 rounded-lg p-4 h-16"></div>
      </div>

      {/* Comparison Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="h-5 w-40 bg-gray-700 rounded mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg aspect-video"></div>
          <div className="bg-gray-900 rounded-lg aspect-video"></div>
        </div>
      </div>

      {/* Changes Skeleton */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="h-5 w-40 bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-700/50 rounded-lg p-4 h-20"></div>
          ))}
        </div>
      </div>

      {/* Buttons Skeleton */}
      <div className="flex gap-4 justify-center pt-6">
        <div className="h-12 w-40 bg-gray-800 rounded-lg"></div>
        <div className="h-12 w-32 bg-gray-800 rounded-lg"></div>
      </div>
    </div>
  );
}
