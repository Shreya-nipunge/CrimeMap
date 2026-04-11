// frontend/src/components/CrimeNewsPanel.jsx
import React, { useState, useEffect } from 'react';
import { ExternalLink, Calendar, MapPin, AlertTriangle, Newspaper } from 'lucide-react';
import { getNews } from '../services/api.js';

const CrimeNewsPanel = ({ city }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!city) return;

    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      try {
        const cityQuery = city.split(',')[0].trim();
        const data = await getNews(cityQuery);
        
        // Strict client-side filtering to ensure city relevance
        const cityName = city.split(',')[0].trim().toLowerCase();
        const filteredData = data.filter(article => 
          (article.title && article.title.toLowerCase().includes(cityName)) || 
          (article.description && article.description.toLowerCase().includes(cityName))
        );
        
        setNews(filteredData.length > 0 ? filteredData.slice(0, 6) : data.slice(0, 6));
      } catch (err) {
        console.error('Error fetching news:', err);
        setError('Unable to load crime news for this location.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [city]);

  if (!city) return null;

  return (
    <div className="w-full mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center border border-blue-500/20">
            <Newspaper className="text-blue-400" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Latest Crime News</h2>
            <p className="text-slate-500 text-xs flex items-center gap-1">
              <MapPin size={12} /> Recent incidents in {city.split(',')[0].trim()}
            </p>
          </div>
        </div>
        <div className="h-px flex-grow bg-gradient-to-r from-blue-500/20 to-transparent ml-6 hidden md:block" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-48 bg-slate-800" />
              <div className="p-5 space-y-4">
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-slate-800 rounded" />
                  <div className="h-3 bg-slate-800 rounded w-5/6" />
                </div>
                <div className="flex justify-between">
                  <div className="h-3 bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-900/40 border border-dashed border-slate-700 rounded-2xl text-slate-500">
          <AlertTriangle size={32} className="mb-3 text-slate-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      ) : news.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-slate-900/40 border border-dashed border-slate-700 rounded-2xl text-slate-500">
          <Newspaper size={32} className="mb-3 text-slate-600" />
          <p className="text-sm font-medium">No recent crime news found for this area.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {news.map((article, index) => (
            <div 
              key={index} 
              className="group bg-slate-900/60 border border-slate-700/50 rounded-2xl overflow-hidden hover:bg-slate-800/60 hover:border-blue-500/30 transition-all duration-300 shadow-xl shadow-black/20 hover:shadow-blue-500/10 flex flex-col h-full"
            >
              {article.image ? (
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1589118949245-7d38baf380d6?q=80&w=2070&auto=format&fit=crop'; }}
                  />
                  <div className="absolute top-3 left-3">
                    <span className="bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Crime Related
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-slate-800 flex items-center justify-center relative">
                  <div className="absolute top-3 left-3">
                    <span className="bg-red-500/10 backdrop-blur-md border border-red-500/30 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">
                      Crime Related
                    </span>
                  </div>
                  <Newspaper className="text-slate-700" size={48} />
                </div>
              )}
              
              <div className="p-5 flex-grow flex flex-col">
                <h3 className="text-base font-bold text-slate-100 leading-snug mb-3 group-hover:text-blue-400 transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-3">
                  {article.description}
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {article.source}
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar size={12} />
                    {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Recent'}
                  </div>
                </div>
                
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white transition-all duration-300 text-xs font-bold group/btn shadow-inner"
                >
                  Read Full Article <ExternalLink size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CrimeNewsPanel;
