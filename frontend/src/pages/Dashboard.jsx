// frontend/src/pages/Dashboard.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FilterPanel from '../components/FilterPanel.jsx';
import StatsBar from '../components/StatsBar.jsx';
import MapView from '../components/MapView.jsx';
import CrimeBarChart from '../components/CrimeBarChart.jsx';
import TrendLineChart from '../components/TrendLineChart.jsx';
import PieDistribution from '../components/PieDistribution.jsx';
import HotspotCards from '../components/HotspotCards.jsx';
import SafetyInsights from '../components/SafetyInsights.jsx';
import CrimeNewsPanel from '../components/CrimeNewsPanel.jsx';
import * as api from '../services/api.js';
import { ShieldAlert, Bell, User as UserIcon } from 'lucide-react';

const DEFAULT_FILTERS = { crime_type: '', region: '', year: '', gender: '' };

export default function Dashboard() {
  const [filters, setFilters]         = useState(DEFAULT_FILTERS);
  const [crimeData, setCrimeData]     = useState([]);
  const [summaryData, setSummaryData] = useState({ total_incidents: 0, top_crime: '—', hottest_zone: '—', under_investigation: 0 });
  const [barData, setBarData]         = useState({ labels: [], values: [] });
  const [trendData, setTrendData]     = useState([]);
  const [hotspotData, setHotspotData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/');
    }
  }, [navigate]);

  // Determine user role (defaults to admin for visibility/dev purposes)
  const userRole = localStorage.getItem('role') || 'admin';
  const isAdmin = userRole === 'admin';
  
  // Re-derive the district data when selection changes
  const selectedDistrictData = useMemo(() => {
    if (!selectedLocation) return null;
    return crimeData.find(c => {
      if (selectedLocation.label && selectedLocation.label.toLowerCase().includes(c.district.toLowerCase())) return true;
      return Math.abs(Number(c.lat) - selectedLocation.lat) < 0.1 && 
             Math.abs(Number(c.lng) - selectedLocation.lng) < 0.1;
    });
  }, [selectedLocation, crimeData]);

  // Fetch initial data (Trend line remains stable across all-district filters)
  useEffect(() => {
    let cancelled = false;
    api.getTrend()
      .then((trend) => {
        if (cancelled) return;
        setTrendData(trend);
      })
      .catch(console.error);
    return () => { cancelled = true; };
  }, []);

  // Fetch crimes, summary, hotspots and stats by type on filter change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    // Fetch all filter-dependent data in parallel
    Promise.all([
      api.getCrimes(filters),
      api.getSummary(filters.year),
      api.getByType(filters.year),
      api.getHotspots(filters.year)
    ])
      .then(([crimesResult, summaryResult, byTypeResult, hotspotsResult]) => {
        if (cancelled) return;
        setCrimeData(crimesResult.data);
        setSummaryData(summaryResult);
        setBarData(byTypeResult);
        setHotspotData(hotspotsResult);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleSelectHotspot = (spot) => {
    // Find coordinates for this district from crimeData
    const match = crimeData.find((c) => c.district === spot.area);
    if (match) {
      setSelectedLocation({ lat: match.lat, lng: match.lng });
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0A1628] text-white overflow-hidden font-sans">
      {/* ── Top Header ───────────────────────────────────── */}
      <header className="h-16 flex-shrink-0 bg-[#0D1E38] border-b border-slate-700/30 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C0392B] flex items-center justify-center shadow-lg shadow-red-900/40">
            <ShieldAlert size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">CrimeMap</h1>
            <p className="text-slate-500 text-[10px] tracking-widest uppercase mt-0.5">Regional Analytics Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link 
              to="/admin" 
              className="px-3 py-1.5 rounded-lg bg-[#0E7C8B] hover:bg-[#0A5A6A] text-xs font-semibold text-white transition-colors"
            >
              📤 Upload CSV
            </Link>
          )}
          <button className="p-2 rounded-lg bg-[#0A1628] text-slate-400 hover:text-white transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0D1E38]" />
          </button>
          <div className="h-8 w-px bg-slate-700/50 mx-1" />
          <div className="flex items-center gap-3 pl-1">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-200 capitalize">{userRole}</p>
              <p className="text-[10px] text-slate-500">Active Session</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center border border-slate-700/50">
              <UserIcon size={18} className="text-slate-300" />
            </div>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('role');
              navigate('/');
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-xs font-semibold text-red-400 transition-colors ml-2"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Scrollable Dashboard Area ────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Row 1: KPI Cards */}
        <section>
          <StatsBar summaryData={summaryData} />
        </section>

        {/* Row 2: Filter Bar */}
        <section>
          <FilterPanel filters={filters} onFilterChange={handleFilterChange} onLocationSelect={setSelectedLocation} />
        </section>

        {/* Row 3: Main Visualization (70/30 Split) */}
        <section className="flex flex-col lg:flex-row gap-6 h-[550px]">
          {/* Left: Interactive Map (70%) */}
          <div className="lg:w-[70%] h-full">
            <MapView crimes={crimeData} loading={loading} selectedLocation={selectedLocation} onLocationSelect={setSelectedLocation} />
          </div>

          {/* Right: Insights & Hotspots Panel (30%) */}
          <div className="lg:w-[30%] h-full flex flex-col gap-4 overflow-y-auto no-scrollbar">
            {selectedDistrictData && (
              <div className="flex-shrink-0">
                <SafetyInsights districtData={selectedDistrictData} />
              </div>
            )}
            <div className="flex-grow">
              <HotspotCards hotspotsData={hotspotData} onSelectHotspot={handleSelectHotspot} />
            </div>
          </div>
        </section>

        {/* Row 4: Analytics Charts */}
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

        {/* Row 5: Crime News Feed (Users Only) */}
        {!isAdmin && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <CrimeNewsPanel city={selectedLocation?.label || 'Maharashtra'} />
          </section>
        )}

        {/* Footer info */}
        <footer className="pt-4 pb-8 flex justify-between items-center text-slate-600 text-[10px] uppercase tracking-[0.2em] font-medium border-t border-slate-800/50">
          <p>© 2026 CrimeWatch | Regional Security Division</p>
          <p>System Status: Operational</p>
        </footer>
      </main>
    </div>
  );
}

