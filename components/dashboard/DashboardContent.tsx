'use client';

import useSWR from 'swr';
import { Heatmap } from '@/components/dashboard/Heatmap';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { CTAFunnel } from '@/components/dashboard/CTAFunnel';
import { ScrollDepth } from '@/components/dashboard/ScrollDepth';
import type { AggregatedAnalytics } from '@/types';

// SWR fetcher function
const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Use SWR for automatic deduplication and revalidation (rule: client-swr-dedup)
export function DashboardContent() {
  const { data: analytics, error, isLoading } = useSWR<AggregatedAnalytics>(
    '/api/analytics',
    fetcher,
    {
      refreshInterval: 10000, // Poll every 10 seconds
      revalidateOnFocus: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
    }
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center text-red-500">Error loading analytics</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center text-gray-400">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Stats Cards */}
      <StatsCards summary={analytics.summary} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Heatmap - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Heatmap data={analytics.heatmapData} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <CTAFunnel funnel={analytics.ctaFunnel} />
          <ScrollDepth scrollData={analytics.scrollData} />
        </div>
      </div>
    </div>
  );
}
