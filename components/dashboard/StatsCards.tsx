'use client';

interface Summary {
  totalSessions: number;
  totalEvents: number;
  bounceRate: number;
  avgSessionDuration: number;
  ctaClickRate: number;
  avgCTAVisibleTime: number;
  ctaExpireRate: number;
}

interface StatsCardsProps {
  summary: Summary;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function StatsCards({ summary }: StatsCardsProps) {
  const cards = [
    {
      label: 'Total Sessions',
      value: summary.totalSessions.toLocaleString(),
      subtext: `${summary.totalEvents.toLocaleString()} events`,
      color: 'blue',
    },
    {
      label: 'Bounce Rate',
      value: `${summary.bounceRate}%`,
      subtext: summary.bounceRate > 50 ? 'High - needs attention' : 'Healthy',
      color: summary.bounceRate > 50 ? 'red' : 'green',
    },
    {
      label: 'Avg Session',
      value: formatDuration(summary.avgSessionDuration),
      subtext: 'Time on site',
      color: 'purple',
    },
    {
      label: 'CTA Click Rate',
      value: `${summary.ctaClickRate}%`,
      subtext: `${summary.avgCTAVisibleTime}s avg visible`,
      color: summary.ctaClickRate > 10 ? 'green' : 'yellow',
    },
    {
      label: 'CTA Expire Rate',
      value: `${summary.ctaExpireRate}%`,
      subtext: 'Ignored CTAs',
      color: summary.ctaExpireRate > 30 ? 'red' : 'green',
    },
  ];

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-xl border p-4 ${colorClasses[card.color]}`}
        >
          <div className="text-xs uppercase tracking-wide opacity-70 mb-1">
            {card.label}
          </div>
          <div className="text-2xl font-bold">{card.value}</div>
          <div className="text-xs opacity-50 mt-1">{card.subtext}</div>
        </div>
      ))}
    </div>
  );
}
