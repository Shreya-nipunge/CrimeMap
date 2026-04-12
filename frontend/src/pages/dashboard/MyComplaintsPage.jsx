// frontend/src/pages/dashboard/MyComplaintsPage.jsx
import { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, AlertCircle, ChevronRight, Calendar, MapPin, XCircle, AlertTriangle } from 'lucide-react';
import { getMyComplaints } from '../../services/api';

export default function MyComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyComplaints = async () => {
      try {
        const data = await getMyComplaints();
        setComplaints(Array.isArray(data) ? data : data?.complaints || []);
      } catch (err) {
        console.error('Error fetching personal complaints:', err);
        setError('Unable to load your reporting history.');
      } finally {
        setLoading(false);
      }
    };

    fetchMyComplaints();
  }, []);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-500 border-red-500/30';
      case 'pending':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={14} />;
      case 'rejected':
        return <AlertCircle size={14} />;
      case 'pending':
        return <Clock size={14} />;
      default:
        return <AlertCircle size={14} />;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent italic tracking-tight">
            MY MONITORING HISTORY
          </h2>
          <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">Track the status of your reported regional incidents.</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 px-4 py-2.5 rounded-2xl shadow-inner">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pending: {complaints.filter(c => c.status === 'pending').length}</span>
           </div>
           <div className="w-[1px] h-3 bg-slate-800" />
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resolved: {complaints.filter(c => c.status === 'resolved').length}</span>
           </div>
           <div className="w-[1px] h-3 bg-slate-800" />
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rejected: {complaints.filter(c => c.status === 'rejected').length}</span>
           </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="py-20 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <AlertCircle size={40} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-400 font-medium">{error}</p>
        </div>
      ) : complaints.length === 0 ? (
        <div className="py-24 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
          <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12">
            <FileText size={32} className="text-slate-600 -rotate-12" />
          </div>
          <h3 className="text-xl font-bold text-slate-300">No reports generated yet</h3>
          <p className="text-slate-500 mt-2 max-w-xs mx-auto text-sm">Your intelligence contributions will appear here once you submit a regional complaint.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {complaints.map((c) => (
            <div 
              key={c.id} 
              className="group bg-slate-900/60 border border-slate-800/50 rounded-2xl p-5 hover:bg-slate-800/40 hover:border-blue-500/30 transition-all duration-300 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden"
            >
              {/* Status Indicator Bar */}
              <div className={`absolute top-0 bottom-0 left-0 w-1 ${c.status === 'resolved' ? 'bg-emerald-500' : c.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
              
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  {c.status === 'pending' ? (
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold text-xs"><Clock size={14} className="animate-pulse" /> Analysis in Progress</span>
                  ) : c.status === 'resolved' ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs"><CheckCircle size={14} /> Intelligence Verified</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500/60 font-bold text-xs"><XCircle size={14} /> Verification Failed</span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-slate-100 uppercase italic tracking-tight mb-2">{c.crime_type}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 italic mb-4 border-l border-slate-700 pl-3 leading-relaxed">
                  {c.description}
                </p>

                {c.status === 'rejected' && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-4">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Administrative Decision</p>
                    <p className="text-xs text-slate-300">This report did not meet our verification criteria. <span className="text-slate-500 font-medium">Reason: {c.rejection_reason || 'Insufficient Data'}</span></p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-y-2 gap-x-6 pt-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin size={14} className="text-slate-600" />
                    <span className="text-xs font-semibold">{c.district}, {c.state}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={14} className="text-slate-600" />
                    <span className="text-xs font-semibold">{new Date(c.timestamp).toLocaleDateString()} at {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800/50">
                 {c.image_url && (
                    <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-700">
                       <img src={c.image_url} alt="Evidence" className="w-full h-full object-cover" />
                    </div>
                 )}
                 <div className="p-3 rounded-xl bg-slate-800/50 text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all cursor-pointer">
                    <ChevronRight size={20} />
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats footer for demo aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
         <div className="bg-gradient-to-br from-blue-600/5 to-indigo-600/5 border border-blue-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Response Rating</p>
            <h4 className="text-2xl font-black text-white italic">HIGH INTEL</h4>
         </div>
         <div className="bg-gradient-to-br from-emerald-600/5 to-teal-600/5 border border-emerald-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Resolution Rate</p>
            <h4 className="text-2xl font-black text-white italic">Active Verification</h4>
         </div>
         <div className="bg-gradient-to-br from-purple-600/5 to-fuchsia-600/5 border border-purple-500/10 p-6 rounded-3xl text-center">
            <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Citizen Trust Score</p>
            <h4 className="text-2xl font-black text-white italic">PLATINUM</h4>
         </div>
      </div>
    </div>
  );
}
