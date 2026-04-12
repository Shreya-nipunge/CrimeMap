import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterPanel from '../../components/FilterPanel.jsx';
import MapView from '../../components/MapView.jsx';
import SafetyInsights from '../../components/SafetyInsights.jsx';
import HotspotCards from '../../components/HotspotCards.jsx';
import * as api from '../../services/api.js';

export default function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlState = searchParams.get('state') || 'Maharashtra';
  
  const [filters, setFilters] = useState({ state: urlState, crime_type: '', region: '', year: '', gender: '' });
  const [crimeData, setCrimeData] = useState([]);
  const [hotspotData, setHotspotData] = useState([]);
  const [complaintsData, setComplaintsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

// Re-derive district Data
  const selectedDistrictData = useMemo(() => {
    if (!selectedLocation) return null;
    return crimeData.find(c => {
      if (selectedLocation.label && selectedLocation.label.toLowerCase().includes((c.district || '').toLowerCase())) return true;
      return Math.abs(Number(c.lat) - selectedLocation.lat) < 0.1 && 
             Math.abs(Number(c.lng) - selectedLocation.lng) < 0.1;
    });
  }, [selectedLocation, crimeData]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    Promise.all([
      api.getCrimes(filters),
      api.getHotspots(filters.state, filters.year),
      api.getComplaints(filters.state)
    ])
      .then(([crimesResult, hotspotsResult, complaintsResult]) => {
        if (cancelled) return;
        setCrimeData(crimesResult.data);
        setHotspotData(hotspotsResult);
        setComplaintsData(complaintsResult.complaints || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, [filters]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      // Sync state back to URL
      if (newFilters.state) {
        setSearchParams({ state: newFilters.state });
      }
      return next;
    });
  }, [setSearchParams]);

  const handleSelectHotspot = (spot) => {
    const match = crimeData.find((c) => {
      const areaName = (spot.area || '').toLowerCase();
      const districtName = (c.district || '').toLowerCase();
      if (!districtName) return false;
      return areaName.includes(districtName) || districtName.includes(areaName.split(',')[0].trim());
    });
    if (match) {
      setSelectedLocation({ 
        lat: Number(match.lat) || 20, 
        lng: Number(match.lng) || 78, 
        label: match.district,
        source: 'hotspot'
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Intelligence Map</h2>
          <p className="text-sm text-slate-400">Live geographic crime distribution</p>
        </div>
      </div>

      <section>
        <FilterPanel filters={filters} onFilterChange={handleFilterChange} onLocationSelect={setSelectedLocation} />
      </section>

      <section className="flex flex-col xl:flex-row gap-6 h-[600px]">
        <div className="xl:w-[70%] h-full">
          <MapView 
            crimes={crimeData} 
            complaints={complaintsData}
            stateName={filters.state}
            loading={loading} 
            selectedLocation={selectedLocation} 
            onLocationSelect={(loc) => {
               setSelectedLocation(loc);
               if (loc && loc.label) {
                 setSearchParams({ state: filters.state, district: loc.label });
               } else {
                 setSearchParams({ state: filters.state });
               }
            }} 
          />
        </div>
        <div className="xl:w-[30%] h-full flex flex-col gap-4 overflow-y-auto no-scrollbar">
          {selectedDistrictData ? (
            <div className="flex-shrink-0">
              <SafetyInsights districtData={selectedDistrictData} />
            </div>
          ) : (
             <div className="bg-[#132240]/50 border border-slate-700/50 rounded-2xl p-6 text-center text-slate-400">
               Click a district monitor to view safety intelligence.
             </div>
          )}
          <div className="flex-grow">
            <HotspotCards hotspotsData={hotspotData} onSelectHotspot={handleSelectHotspot} />
          </div>
        </div>
      </section>
    </div>
  );
}
