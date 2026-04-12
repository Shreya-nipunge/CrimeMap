import { useState, useEffect } from 'react';
import { getComplaints, updateComplaintStatus } from '../../services/api.js';
import { CheckCircle, AlertTriangle, Eye, Image as ImageIcon, MapPin, Search } from 'lucide-react';

function timeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) return interval + " year" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) return interval + " month" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 86400);
  if (interval >= 1) return interval + " day" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 3600);
  if (interval >= 1) return interval + " hour" + (interval > 1 ? "s" : "") + " ago";
  interval = Math.floor(seconds / 60);
  if (interval >= 1) return interval + " minute" + (interval > 1 ? "s" : "") + " ago";
  return "just now";
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'resolved'
  const [search, setSearch] = useState('');
  
  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [confirmResolve, setConfirmResolve] = useState(null); // id of complaint being confirmed
  const [isResolving, setIsResolving] = useState(false);

  const fetchComplaints = async () => {
    try {
      const db = await getComplaints();
      // Ensure we sort by date descending
      const sorted = (db.complaints || []).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
      setComplaints(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolve = async (id) => {
    setIsResolving(true);
    try {
      // Using the service function instead of direct apiClient
      await updateComplaintStatus(id);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c));
      setConfirmResolve(null);
      if (selectedComplaint?.id === id) {
         setSelectedComplaint(prev => ({...prev, status: 'resolved'}));
      }
    } catch (e) {
       console.error("Failed to resolve", e);
    }
    setIsResolving(false);
  };

  const pendingCount = complaints.filter(c => c.status === 'pending').length;

  const filteredComplaints = complaints.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || 
             (c.location || '').toLowerCase().includes(q) || 
             (c.crime_type || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
             Citizen Intelligence Desk
             {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-[0_0_10px_-3px_rgba(239,68,68,1)]">
                   {pendingCount} New
                </span>
             )}
          </h2>
          <p className="text-sm text-slate-400 mt-1">Review and process intelligence reports submitted by the public.</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-[#132240] p-4 rounded-xl border border-slate-700/50">
         <div className="flex items-center gap-2 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
           {['all', 'pending', 'resolved'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${filter === f ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                 {f}
              </button>
           ))}
         </div>
         <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Search Name, Location, Crime..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full md:w-80 bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-200" 
            />
         </div>
      </div>

      {/* Table Area */}
      <div className="bg-[#132240] border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl">
         <div className="overflow-x-auto">
           <table className="w-full text-left text-sm text-slate-400">
             <thead className="bg-[#0D1E38] text-xs uppercase font-semibold text-slate-500 border-b border-slate-700/50">
               <tr>
                 <th className="px-6 py-4">Reporter</th>
                 <th className="px-6 py-4">Intelligence Type</th>
                 <th className="px-6 py-4">Location Focus</th>
                 <th className="px-6 py-4">Timestamp</th>
                 <th className="px-6 py-4">Status</th>
                 <th className="px-6 py-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-700/30">
               {loading ? (
                 <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                       <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
                          Decrypting Database...
                       </div>
                    </td>
                 </tr>
               ) : filteredComplaints.length === 0 ? (
                 <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                       {search ? "No records matched your search parameters." : "No reports logged in the registry yet."}
                    </td>
                 </tr>
               ) : (
                 filteredComplaints.map(comp => (
                   <tr key={comp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                         <div className="font-bold text-slate-200">{comp.name || 'Anonymous Viewer'}</div>
                         <div className="text-xs text-slate-500">{comp.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 font-medium text-xs border border-blue-500/20">
                           {comp.crime_type}
                           {comp.image_url && <ImageIcon size={12} className="text-blue-300" />}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="max-w-[150px] truncate" title={comp.location}>{comp.location}</div>
                         <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 uppercase"><MapPin size={10} /> {comp.district}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="text-slate-300 font-medium">{timeAgo(comp.timestamp)}</span>
                      </td>
                      <td className="px-6 py-4">
                         {comp.status === 'pending' ? (
                            <span className="flex items-center gap-1.5 text-orange-400 font-bold text-xs"><AlertTriangle size={14} /> Pending</span>
                         ) : (
                            <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs"><CheckCircle size={14} /> Resolved</span>
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                         {confirmResolve === comp.id ? (
                            <div className="flex items-center justify-end gap-2 animate-in fade-in duration-300">
                               <span className="text-[10px] font-bold text-slate-300 uppercase">Confirm?</span>
                               <button 
                                 disabled={isResolving}
                                 onClick={() => handleResolve(comp.id)}
                                 className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded text-xs transition-colors"
                               >Yes</button>
                               <button 
                                 onClick={() => setConfirmResolve(null)}
                                 className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs transition-colors"
                               >No</button>
                            </div>
                         ) : (
                            <div className="flex items-center justify-end gap-2">
                               <button 
                                  onClick={() => setSelectedComplaint(comp)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-md transition-colors"
                                  title="View Details"
                               ><Eye size={16} /></button>
                               
                               {comp.status === 'pending' && (
                                  <button 
                                     onClick={() => setConfirmResolve(comp.id)}
                                     className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 border border-transparent hover:border-emerald-400 hover:text-white text-emerald-500 rounded-md transition-colors"
                                     title="Mark Resolved"
                                  ><CheckCircle size={16} /></button>
                               )}
                            </div>
                         )}
                      </td>
                   </tr>
                 ))
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-[#0D1E38] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
              
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 sticky top-0 z-10">
                 <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      Intelligence Briefing
                      {selectedComplaint.status === 'pending' ? (
                        <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-orange-500/20">Pending Action</span>
                      ) : (
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold border border-emerald-500/20">Resolved</span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Logged {new Date(selectedComplaint.timestamp).toLocaleString()}</p>
                 </div>
                 <button onClick={() => setSelectedComplaint(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-500 hover:text-white">
                    ✕
                 </button>
              </div>

              <div className="p-6 space-y-6">
                 
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-[#132240] p-4 rounded-xl border border-slate-700/50">
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Target Location</span>
                       <span className="text-slate-200 font-medium">{selectedComplaint.location}</span>
                       <div className="text-xs text-slate-400 mt-1">GPS: {selectedComplaint.lat.toFixed(4)}, {selectedComplaint.lng.toFixed(4)}</div>
                    </div>
                    <div className="bg-[#132240] p-4 rounded-xl border border-slate-700/50">
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Human Source</span>
                       <span className="text-slate-200 font-medium">{selectedComplaint.name}</span>
                       <div className="text-xs text-slate-400 mt-1">{selectedComplaint.phone} {selectedComplaint.email ? `• ${selectedComplaint.email}` : ''}</div>
                    </div>
                 </div>

                 <div className="bg-[#132240] p-5 rounded-xl border border-slate-700/50">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-700/50 pb-2">
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Classification</span>
                       <span className="px-2 py-1 bg-red-500/10 text-red-400 font-bold text-xs rounded border border-red-500/30">{selectedComplaint.crime_type}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{selectedComplaint.description}</p>
                 </div>

                 {selectedComplaint.image_url && (
                    <div>
                       <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Attached Evidence</span>
                       <div className="bg-black/50 border border-slate-800 rounded-xl overflow-hidden flex justify-center p-2">
                           <img 
                             src={selectedComplaint.image_url} 
                             alt="Attached evidence" 
                             className="max-h-64 object-contain rounded-lg shadow-2xl"
                             onError={(e) => { e.target.style.display = 'none'; e.target.parentNode.innerHTML += '<p class="text-xs text-red-400 py-4">Evidence file corrupted or missing.</p>' }}
                           />
                       </div>
                    </div>
                 )}

              </div>

              {selectedComplaint.status === 'pending' && (
                 <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-end gap-3 sticky bottom-0 z-10">
                    <button 
                       onClick={() => setSelectedComplaint(null)}
                       className="px-4 py-2 font-semibold text-xs text-slate-400 hover:text-white transition-colors"
                    >Close Briefing</button>
                    {confirmResolve === selectedComplaint.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300">Confirm resolution?</span>
                        <button 
                           onClick={() => handleResolve(selectedComplaint.id)}
                           disabled={isResolving}
                           className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-lg transition-colors"
                        >Execute</button>
                      </div>
                    ) : (
                      <button 
                         onClick={() => setConfirmResolve(selectedComplaint.id)}
                         className="px-6 py-2 bg-[#132240] hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg font-bold text-xs transition-colors shadow-lg"
                      >Mark as Resolved</button>
                    )}
                 </div>
              )}

           </div>
        </div>
      )}

    </div>
  );
}
