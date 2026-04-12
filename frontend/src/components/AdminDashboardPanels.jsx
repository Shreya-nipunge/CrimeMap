import { useState, useEffect } from 'react';
import { getAdminInsights, getComplaints, updateComplaintStatus } from '../services/api';
import { TrendingUp, AlertTriangle, ShieldCheck, Clock, CheckCircle } from 'lucide-react';

export default function AdminDashboardPanels({ stateName }) {
  const [insights, setInsights] = useState({ rising_crimes: [], auto_insight: '' });
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    getAdminInsights(stateName)
      .then(setInsights)
      .catch(console.error);
      
    getComplaints(stateName)
      .then(res => setComplaints(res.complaints || []))
      .catch(console.error);
  }, [stateName]);

  const handleResolve = async (id) => {
    try {
      await updateComplaintStatus(id);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full min-h-[400px]">
      {/* Analytics Panel */}
      <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
          <TrendingUp className="text-orange-400" size={24} />
          <h2 className="text-lg font-bold text-slate-100">Smart Analytics & Rising Crimes</h2>
        </div>
        
        <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-4 mb-6">
          <h3 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-1">Auto-Generated Insight</h3>
          <p className="text-sm text-slate-300">{insights.auto_insight}</p>
        </div>

        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Top Rising Categories</h3>
        <div className="space-y-3 flex-1 overflow-y-auto pr-2 no-scrollbar">
          {insights.rising_crimes.map((crime, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">#{idx + 1}</div>
                <div>
                  <p className="font-bold text-slate-200">{crime.type}</p>
                  <p className="text-xs text-slate-500">{crime.latest} incidents reported</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-orange-400 font-bold">+{crime.growth_pct}%</span>
                <p className="text-[10px] text-slate-500 uppercase mt-0.5">Growth</p>
              </div>
            </div>
          ))}
          {insights.rising_crimes.length === 0 && (
            <p className="text-slate-500 text-sm italic">Insufficient data to calculate trends.</p>
          )}
        </div>
      </div>

      {/* Complaints Review Panel */}
      <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-6 flex flex-col">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
          <AlertTriangle className="text-blue-400" size={24} />
          <h2 className="text-lg font-bold text-slate-100">Citizen Intelligence Desk</h2>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
          {complaints.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <ShieldCheck size={48} className="mb-4 opacity-20" />
              <p>No active reports in this sector.</p>
            </div>
          )}
          
          {complaints.map(c => (
            <div key={c.id} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase">
                    {c.crime_type}
                  </span>
                  <p className="text-white font-semibold mt-2">{c.district} · {new Date(c.timestamp).toLocaleDateString()}</p>
                </div>
                {c.status === 'pending' ? (
                  <button 
                    onClick={() => handleResolve(c.id)}
                    className="flex items-center gap-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors border border-green-500/20"
                  >
                    <CheckCircle size={14} /> Mark Resolved
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-slate-500 text-[11px] font-bold px-3 py-1.5"><CheckCircle size={14} /> Resolved</span>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-2">{c.description}</p>
              <div className="flex items-center gap-1 mt-3 text-[10px] text-slate-500">
                <Clock size={12} /> Reported by {c.user_email}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
