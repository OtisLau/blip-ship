'use client';

import { useRef, useEffect, useState } from 'react';

interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}

interface HeatmapData {
  clicks: HeatmapPoint[];
  rageClicks: HeatmapPoint[];
  deadClicks: HeatmapPoint[];
}

interface HeatmapProps {
  data: HeatmapData;
}

type ViewMode = 'clicks' | 'rageClicks' | 'deadClicks';

export function Heatmap({ data }: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('clicks');
  const [dimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Draw store layout placeholder
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;

    // Header area
    ctx.strokeRect(10, 10, dimensions.width - 20, 60);
    ctx.fillStyle = '#444';
    ctx.font = '12px monospace';
    ctx.fillText('Header', 20, 45);

    // Hero area
    ctx.strokeRect(10, 80, dimensions.width - 20, 150);
    ctx.fillText('Hero Section', 20, 160);

    // Product grid
    ctx.strokeRect(10, 240, dimensions.width - 20, 200);
    ctx.fillText('Product Grid', 20, 350);

    // Footer
    ctx.strokeRect(10, 450, dimensions.width - 20, 80);
    ctx.fillText('Footer', 20, 495);

    // Get points based on view mode
    const points = data[viewMode] || [];
    if (points.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '14px monospace';
      ctx.fillText('No data for this view', dimensions.width / 2 - 80, dimensions.height / 2);
      return;
    }

    // Find max count for intensity scaling
    const maxCount = Math.max(...points.map((p) => p.count), 1);

    // Color schemes for different modes
    const colorSchemes: Record<ViewMode, { r: number; g: number; b: number }> = {
      clicks: { r: 59, g: 130, b: 246 },      // Blue
      rageClicks: { r: 239, g: 68, b: 68 },   // Red
      deadClicks: { r: 234, g: 179, b: 8 },   // Yellow
    };

    const color = colorSchemes[viewMode];

    // Draw heatmap points
    points.forEach((point) => {
      // Scale coordinates to canvas size (assuming original viewport was ~1920x1080)
      const x = (point.x / 1920) * dimensions.width;
      const y = (point.y / 1080) * dimensions.height;
      const intensity = point.count / maxCount;
      const radius = 20 + intensity * 30;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.8 * intensity})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.4 * intensity})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw count label for significant points
      if (point.count > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText(String(point.count), x - 5, y + 3);
      }
    });
  }, [data, viewMode, dimensions]);

  const totalClicks = data.clicks.reduce((sum, p) => sum + p.count, 0);
  const totalRage = data.rageClicks.reduce((sum, p) => sum + p.count, 0);
  const totalDead = data.deadClicks.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Click Heatmap</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('clicks')}
            className={`px-3 py-1 rounded text-sm transition ${
              viewMode === 'clicks'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Clicks ({totalClicks})
          </button>
          <button
            onClick={() => setViewMode('rageClicks')}
            className={`px-3 py-1 rounded text-sm transition ${
              viewMode === 'rageClicks'
                ? 'bg-red-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Rage ({totalRage})
          </button>
          <button
            onClick={() => setViewMode('deadClicks')}
            className={`px-3 py-1 rounded text-sm transition ${
              viewMode === 'deadClicks'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Dead ({totalDead})
          </button>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
        />
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Normal clicks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Rage clicks (frustration)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>Dead clicks (no response)</span>
        </div>
      </div>
    </div>
  );
}
