'use client';

interface CTAFunnelProps {
  funnel: {
    visible: number;
    clicked: number;
    expired: number;
    conversionRate: number;
  };
}

export function CTAFunnel({ funnel }: CTAFunnelProps) {
  const { visible, clicked, expired, conversionRate } = funnel;

  // Calculate percentages for bar widths
  const maxVal = Math.max(visible, clicked, expired, 1);
  const visiblePct = (visible / maxVal) * 100;
  const clickedPct = (clicked / maxVal) * 100;
  const expiredPct = (expired / maxVal) * 100;

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold mb-4">CTA Funnel</h2>

      <div className="space-y-4">
        {/* Visible */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Visible</span>
            <span className="text-white font-medium">{visible}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${visiblePct}%` }}
            />
          </div>
        </div>

        {/* Clicked */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Clicked</span>
            <span className="text-green-400 font-medium">{clicked}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${clickedPct}%` }}
            />
          </div>
        </div>

        {/* Expired */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Expired</span>
            <span className="text-red-400 font-medium">{expired}</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 rounded-full transition-all duration-500"
              style={{ width: `${expiredPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Conversion Rate */}
      <div className="mt-6 pt-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Conversion Rate</span>
          <span className={`text-2xl font-bold ${
            conversionRate > 15 ? 'text-green-400' :
            conversionRate > 5 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {conversionRate}%
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {conversionRate > 15 ? 'Excellent performance' :
           conversionRate > 5 ? 'Room for improvement' : 'Needs optimization'}
        </p>
      </div>
    </div>
  );
}
