'use client';

interface ScrollDepthProps {
  scrollData: {
    reached25: number;
    reached50: number;
    reached75: number;
    reached100: number;
  };
}

export function ScrollDepth({ scrollData }: ScrollDepthProps) {
  const { reached25, reached50, reached75, reached100 } = scrollData;

  const depths = [
    { label: '25%', value: reached25, color: 'bg-blue-400' },
    { label: '50%', value: reached50, color: 'bg-blue-500' },
    { label: '75%', value: reached75, color: 'bg-blue-600' },
    { label: '100%', value: reached100, color: 'bg-blue-700' },
  ];

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold mb-4">Scroll Depth</h2>

      <div className="space-y-3">
        {depths.map((depth) => (
          <div key={depth.label} className="flex items-center gap-3">
            <div className="w-12 text-right text-sm text-gray-400">
              {depth.label}
            </div>
            <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
              <div
                className={`h-full ${depth.color} transition-all duration-500 flex items-center justify-end pr-2`}
                style={{ width: `${Math.max(depth.value, 5)}%` }}
              >
                {depth.value > 15 && (
                  <span className="text-xs text-white font-medium">
                    {depth.value}%
                  </span>
                )}
              </div>
            </div>
            {depth.value <= 15 && (
              <div className="w-10 text-sm text-gray-400">{depth.value}%</div>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 mt-4">
        % of sessions reaching each scroll depth
      </p>
    </div>
  );
}
