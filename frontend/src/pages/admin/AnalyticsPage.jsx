import { useState, useEffect } from 'react';
import StatsBar from '../../components/StatsBar.jsx';
import CrimeBarChart from '../../components/CrimeBarChart.jsx';
import TrendLineChart from '../../components/TrendLineChart.jsx';
import PieDistribution from '../../components/PieDistribution.jsx';
import AdminDashboardPanels from '../../components/AdminDashboardPanels.jsx';
import * as api from '../../services/api.js';

export default function AnalyticsPage() {
  const stateName = 'Maharashtra'; // Hardcoded for demo, could use params
  const [summaryData, setSummaryData] = useState({ total_incidents: 0, top_crime: '—', hottest_zone: '—', under_investigation: 0 });
  const [barData, setBarData] = useState({ labels: [], values: [] });
  const [trendData, setTrendData] = useState([]);
  
  useEffect(() => {
    let cancelled = false;
    
    Promise.all([
      api.getTrend(stateName),
      api.getSummary(stateName, ''),
      api.getByType(stateName, '')
    ]).then(([trend, summary, byType]) => {
      if (cancelled) return;
      setTrendData(trend);
      setSummaryData(summary);
      setBarData(byType);
    }).catch(console.error);
    
    return () => { cancelled = true; };
  }, [stateName]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Command Center Analytics</h2>
        <p className="text-sm text-slate-400 mt-1">High-level systemic oversight and macro trend analysis.</p>
      </div>

      {/* Row 1: KPI Cards */}
      <section>
        <StatsBar summaryData={summaryData} />
      </section>

      {/* Row 2: Analytics Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-4 h-[350px]">
          <CrimeBarChart barData={barData} />
        </div>
        <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-4 h-[350px]">
          <TrendLineChart trendData={trendData} />
        </div>
        <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-4 h-[350px]">
          <PieDistribution barData={barData} />
        </div>
      </section>

      {/* Row 3: Admin Panels */}
      <section className="mt-6">
        <AdminDashboardPanels stateName={stateName} />
      </section>
    </div>
  );
}
