'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  dailyActiveJournalers: Array<{ date: string; activeUsers: number }>;
  totalUniqueUsers: number;
  cohortRetention: Array<{ week: string; activeUsers: number; retentionRate: number }>;
  streakLeaderboard: Array<{ userId: string; email: string; streak: number; totalEntries: number }>;
  promptEngagement: Array<{ prompt: string; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-64 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-lg p-6 shadow-sm border border-primary-200" style={{ backgroundColor: '#FFF9E8' }}>
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error loading analytics</h2>
            <p className="text-red-600">{error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(...data.dailyActiveJournalers.map(d => d.activeUsers));
  const maxEngagement = Math.max(...data.promptEngagement.map(p => p.count));

  return (
    <div className="min-h-screen p-6 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#9B046F] mb-2">📊 Analytics Dashboard</h1>
          <p className="text-[#9B046F]">Monitor user behavior and journaling insights</p>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-[#9B046F] mb-2">🌟 Total Unique Users</h3>
            <p className="text-3xl font-bold text-[#9B046F]">{data.totalUniqueUsers}</p>
          </div>
          
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-[#9B046F] mb-2">🔥 Active This Week</h3>
            <p className="text-3xl font-bold text-[#9B046F]">
              {data.cohortRetention[data.cohortRetention.length - 1]?.activeUsers || 0}
            </p>
          </div>
          
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-[#9B046F] mb-2">🏆 Top Streak</h3>
            <p className="text-3xl font-bold text-[#9B046F]">
              {data.streakLeaderboard[0]?.streak || 0} days
            </p>
          </div>
          
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-sm font-medium text-[#9B046F] mb-2">📅 Total Sessions</h3>
            <p className="text-3xl font-bold text-[#9B046F]">
              {data.promptEngagement.reduce((sum, p) => sum + p.count, 0)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Active Journalers */}
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-lg font-semibold text-[#9B046F] mb-4">📈 Daily Active Journalers (30 days)</h3>
            <div className="h-64 relative">
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#FF6B6B', stopOpacity: 0.3}} />
                    <stop offset="100%" style={{stopColor: '#FF6B6B', stopOpacity: 0}} />
                  </linearGradient>
                </defs>
                {/* Grid lines */}
                {[0, 50, 100, 150, 200].map(y => (
                  <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#e2e8f0" strokeWidth="1"/>
                ))}
                {/* Line chart */}
                <polyline
                  fill="url(#gradient)"
                  stroke="#FF6B6B"
                  strokeWidth="2"
                  points={data.dailyActiveJournalers.map((d, i) => 
                    `${(i / (data.dailyActiveJournalers.length - 1)) * 400},${200 - (d.activeUsers / (maxDaily || 1)) * 180}`
                  ).join(' ')}
                />
              </svg>
            </div>
          </div>

          {/* Cohort Retention */}
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-lg font-semibold text-[#9B046F] mb-3">📅 Weekly Cohort Retention</h3>
            <div className="space-y-2">
              {data.cohortRetention.map((cohort, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[#9B046F] font-medium">{cohort.week}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[#9B046F] font-medium">{cohort.activeUsers} users</span>
                    <div className="w-20 bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-pink-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${cohort.retentionRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-[#9B046F] w-10">{cohort.retentionRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Streak Leaderboard */}
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-lg font-semibold text-[#9B046F] mb-4">🏅 Streak Leaderboard</h3>
            <div className="space-y-3">
              {data.streakLeaderboard.map((user, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-[#9B046F]">#{i + 1}</span>
                    <span className="text-[#9B046F] text-sm truncate max-w-[200px]">{user.email}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-[#9B046F]">{user.streak} days</span>
                    <p className="text-xs text-[#9B046F]">{user.totalEntries} total entries</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Engagement */}
          <div className="rounded-lg p-6 shadow-sm border border-slate-200 bg-white">
            <h3 className="text-lg font-semibold text-[#9B046F] mb-4">🤖 Companion Usage</h3>
            <div className="space-y-4">
              {data.promptEngagement.map((prompt, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[#9B046F] font-medium">{prompt.prompt}</span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-slate-200 rounded-full h-3">
                      <div 
                        className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${(prompt.count / (maxEngagement || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[#9B046F] font-semibold w-8 text-right">{prompt.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}