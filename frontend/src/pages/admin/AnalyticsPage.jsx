import { useState, useEffect } from 'react';
import StatsBar from '../../components/StatsBar.jsx';
import CrimeBarChart from '../../components/CrimeBarChart.jsx';
import TrendLineChart from '../../components/TrendLineChart.jsx';
import PieDistribution from '../../components/PieDistribution.jsx';
import AdminDashboardPanels from '../../components/AdminDashboardPanels.jsx';
import * as api from '../../services/api.js';

export default function AnalyticsPage() {
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedYear, setSelectedYear] = useState(''); // '' means All Years
  
  const [summaryData, setSummaryData] = useState({ total_incidents: 0, top_crime: '—', hottest_zone: '—', under_investigation: 0 });
  const [barData, setBarData] = useState({ labels: [], values: [] });
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    Promise.all([
      api.getTrend(selectedState), // TREND ALWAYS IGNORES YEAR
      api.getSummary(selectedState, selectedYear),
      api.getByType(selectedState, selectedYear)
    ]).then(([trend, summary, byType]) => {
      if (cancelled) return;
      setTrendData(trend);
      setSummaryData(summary);
      setBarData(byType);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
    
    return () => { cancelled = true; };
  }, [selectedState, selectedYear]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Command Center Analytics</h2>
          <p className="text-sm text-slate-400 mt-1">High-level systemic oversight and macro trend analysis.</p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-3 bg-[#132240] p-2 rounded-xl border border-slate-700/50 shadow-lg">
           <select 
             value={selectedState} 
             onChange={(e) => setSelectedState(e.target.value)}
             className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
           >
              <option value="all">National (All States)</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Delhi">Delhi</option>
           </select>

           <select 
             value={selectedYear} 
             onChange={(e) => setSelectedYear(e.target.value)}
             className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
           >
              <option value="">All Time Range</option>
              {['2017', '2018', '2019', '2020', '2021', '2022'].map(y => (
                <option key={y} value={y}>{y} Dataset</option>
              ))}
           </select>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-500">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest">Recalculating Intelligence...</p>
        </div>
      ) : (
        <>
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
            <AdminDashboardPanels stateName={selectedState} year={selectedYear} />
          </section>
        </>
      )}
    </div>
  );
}
