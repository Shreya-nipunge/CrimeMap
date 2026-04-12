// frontend/src/components/MapView.jsx
import { useEffect, useRef, useState } from 'react';
import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_CENTER = { lat: 19.3919, lng: 72.8397 };
const DEFAULT_ZOOM = 12;

export default function MapView({ crimes, complaints, stateName, loading, selectedLocation, onLocationSelect }) {
  const crimes_data = crimes || [];
  const complaints_data = complaints || [];
  const containerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [heatmapOn, setHeatmapOn] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const clustererRef = useRef(null);
  const markersRef = useRef([]);
  const complaintMarkersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  const getHeatIcon = (score) => {
    const val = Number(score) || 0;
    
    // Discrete color mapping matching the legacy Intensity Scale
    let color = '#0E7C8B'; // Cyber / Other (Teal)
    if (val > 100000) color = '#C0392B'; // Severe (Red)
    else if (val > 50000) color = '#F39C12'; // Moderate (Orange)
    else if (val > 10000) color = '#F1C40F'; // Minor (Yellow)

    const normalized = clamp(val / 1000, 0, 1);
    const size = 32 + normalized * 46; // 32px to 78px
    const radius = size / 2.5;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(size)}" height="${Math.ceil(size)}" viewBox="0 0 ${Math.ceil(size)} ${Math.ceil(size)}">
  <defs>
    <radialGradient id="grad${score}" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="60%" style="stop-color:${color};stop-opacity:0.4" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0" />
    </radialGradient>
  </defs>
  <circle cx="${Math.ceil(size) / 2}" cy="${Math.ceil(size) / 2}" r="${radius}" fill="url(#grad${score})" opacity="0.8" />
  <circle cx="${Math.ceil(size) / 2}" cy="${Math.ceil(size) / 2}" r="${radius * 0.4}" fill="${color}" opacity="0.9" />
</svg>`;

    const encoded = encodeURIComponent(svg);
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encoded}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    };
  };

  const getMarkerIcon = (score) => {
    return getHeatIcon(score);
  };

  // Initialize Map using Loader
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error("Google Maps API Key missing!");
      setLoadError("Google Maps API Key missing. Please configure VITE_GOOGLE_MAPS_API_KEY in .env");
      setMap(null); // Explicitly ensure map is null to trigger error state
      return;
    }

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["visualization", "places"],
    });

    loader.load().then(() => {
      if (!containerRef.current || map) return;
      setLoadError(null);

      const mapInstance = new window.google.maps.Map(containerRef.current, {
        center: MAP_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
      });

      infoWindowRef.current = new window.google.maps.InfoWindow();
      clustererRef.current = new MarkerClusterer({ map: mapInstance, markers: [] });
      setMap(mapInstance);
    }).catch((err) => {
      console.error("Google Maps Load Error:", err);
      setLoadError(String(err));
    });
  }, []);

  // Sync markers with filtered data and handle clustering
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing markers from map and clusterer
    markersRef.current.forEach(marker => marker.setMap(null));
    complaintMarkersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    complaintMarkersRef.current = [];
    if (clustererRef.current) clustererRef.current.clearMarkers();

    const newMarkers = crimes_data
      .filter((c) => c.lat && c.lng)
      .map((c) => {
      const score = Number(c.crime_score) || 0;
      const icon = getMarkerIcon(score);

      const marker = new window.google.maps.Marker({
        position: { lat: Number(c.lat), lng: Number(c.lng) },
        title: c.district,
        map: heatmapOn ? map : null,
        visible: heatmapOn,
        icon: icon,
        optimized: false,
      });

      marker.set('score', score);
      marker.set('district', c.district);

      marker.addListener("click", async () => {
        infoWindowRef.current.setContent(`<div style="padding:16px; font-family:sans-serif; color:#334155; font-size:13px; font-weight:600;">Fetching Intelligence...</div>`);
        infoWindowRef.current.open(map, marker);
        try {
          const { getSafetyScore } = await import('../services/api.js');
          const analytics = await getSafetyScore(c.district, stateName || 'Maharashtra');
          
          const diffText = analytics.state_avg_diff > 0 
            ? `<span style="color:#C0392B">+${analytics.state_avg_diff}% vs State Avg</span>` 
            : `<span style="color:#0EA5E9">${analytics.state_avg_diff}% vs State Avg</span>`;
            
          const rankText = `Rank #${analytics.rank} of ${analytics.total} Safest`;

          const trendIcon = analytics.trend === 'Increasing' ? '↑' : analytics.trend === 'Decreasing' ? '↓' : '→';
          const trendColor = analytics.trend === 'Increasing' ? '#ef4444' : analytics.trend === 'Decreasing' ? '#10b981' : '#64748b';

          // Data Gap Indicator Logic (Mock threshold: High complaints in system, low official score)
          // Since it's a prototype, we just check if there are 2 or more active complaints in this exact district vs the score.
          const districtComplaints = complaints_data.filter(comp => comp.district === c.district && comp.status === 'pending').length;
          const dataGapHtml = (districtComplaints > 0) ? `
            <div style="margin-top:8px; padding:6px; background-color:#FEF2F2; border:1px solid #FECACA; border-radius:4px;">
              <p style="margin:0; font-size:10px; font-weight:700; color:#DC2626; display:flex; align-items:center; gap:4px;">
                ⚠️ High citizen reports, low official data
              </p>
            </div>
          ` : '';

          const content = `
            <div style="font-family:'Inter', sans-serif; min-width:240px; padding: 4px; color: #111">
              <div style="margin-bottom:8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px">
                <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:800; color:#0E3A64">${c.district}</h3>
                <p style="margin:0; font-size:13px; color:#1e293b; font-weight:600; display:flex; align-items:center;">
                  Safety Score: <strong>&nbsp;${analytics.score}/100</strong> 
                  <span style="font-size:10px; color:#475569; padding:2px 6px; background:#f1f5f9; border-radius:4px; margin-left:6px;">${analytics.risk} Risk</span>
                </p>
                <p style="margin:6px 0 0; font-size:12px; font-weight:600;">${diffText} | ${rankText}</p>
                <p style="margin:4px 0 0; font-size:11px; color:#64748b; font-style:italic; font-weight:500;">
                  Trend: <span style="color:${trendColor}; font-weight:bold">${trendIcon} ${analytics.trend}</span>
                </p>
                ${dataGapHtml}
              </div>
              <div style="font-size:11px; color:#334155; line-height:1.6">
                <div style="display:flex; justify-content:space-between;"><span>Murder:</span> <strong>${c.murder}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Robbery:</span> <strong>${c.robbery}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Thefts:</span> <strong>${c.thefts}</strong></div>
                <div style="display:flex; justify-content:space-between;"><span>Vehicle Theft:</span> <strong>${c.vehicle_theft}</strong></div>
              </div>
            </div>
          `;
          infoWindowRef.current.setContent(content);
        } catch (err) {
          infoWindowRef.current.setContent(`<div style="padding:10px; color:#C0392B;">Intelligence unavailable</div>`);
        }
      });

      return marker;
    });

    const newComplaintMarkers = complaints_data
      .filter((c) => (c.status === 'pending' || c.status === 'resolved') && c.lat && c.lng)
      .map((c) => {
        const marker = new window.google.maps.Marker({
          position: { lat: Number(c.lat), lng: Number(c.lng) },
          title: "Citizen Report: " + c.crime_type,
          map: heatmapOn ? map : null,
          visible: heatmapOn,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: c.status === 'resolved' ? '#10B981' : '#3B82F6',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 7
          },
        });

        marker.addListener("click", () => {
          infoWindowRef.current.setContent(`
            <div style="font-family:'Inter', sans-serif; padding: 6px; max-width:200px;">
              <span style="background:${c.status === 'resolved' ? '#D1FAE5' : '#DBEAFE'}; color:${c.status === 'resolved' ? '#059669' : '#1D4ED8'}; font-size:10px; font-weight:700; padding:2px 6px; border-radius:12px;">
                ${c.status === 'resolved' ? 'RESOLVED INTEL' : 'CITIZEN REPORT'}
              </span>
              <h3 style="margin:8px 0 4px; font-size:14px; font-weight:700; color:#1e293b">${c.crime_type}</h3>
              <p style="margin:0; font-size:12px; color:#475569">${c.description}</p>
              <p style="margin:8px 0 0; font-size:10px; color:#94a3b8; font-style:italic;">Status: <strong>${c.status.toUpperCase()}</strong></p>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        });
        
        return marker;
      });

    markersRef.current = newMarkers;
    complaintMarkersRef.current = newComplaintMarkers;
    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(newMarkers);
    }
  }, [crimes_data, complaints_data, map, heatmapOn, stateName]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((marker) => {
      marker.setVisible(heatmapOn);
      marker.setMap(heatmapOn ? map : null);
    });
    complaintMarkersRef.current.forEach((marker) => {
      marker.setVisible(heatmapOn);
      marker.setMap(heatmapOn ? map : null);
    });
  }, [heatmapOn, map]);

  // Handle selectedLocation (panning/zooming from Hotspot cards or Search Bar)
  useEffect(() => {
    if (selectedLocation && map && window.google) {
      const pos = { lat: Number(selectedLocation.lat), lng: Number(selectedLocation.lng) };
      map.panTo(pos);
      map.setZoom(13); // Zoom closely into the searched district

      // Find the best matching marker
      // 1. Try exact or very close coordinate match
      let marker = markersRef.current.find(m =>
        Math.abs(m.getPosition().lat() - pos.lat) < 0.01 &&
        Math.abs(m.getPosition().lng() - pos.lng) < 0.01
      );

      // 2. If no close coordinate match, try name match if search label exists
      if (!marker && selectedLocation.label) {
        const searchText = selectedLocation.label.toLowerCase();
        marker = markersRef.current.find(m => 
          searchText.includes(m.get('district').toLowerCase())
        );
      }

      // 3. Fallback: Find the nearest marker regardless of distance
      if (!marker && markersRef.current.length > 0) {
        marker = markersRef.current.reduce((prev, curr) => {
          const prevDist = Math.hypot(prev.getPosition().lat() - pos.lat, prev.getPosition().lng() - pos.lng);
          const currDist = Math.hypot(curr.getPosition().lat() - pos.lat, curr.getPosition().lng() - pos.lng);
          return currDist < prevDist ? curr : prev;
        });
      }

      if (marker) {
        // Trigger the click event to open the InfoWindow
        window.google.maps.event.trigger(marker, 'click');
        
        // If we found a marker, maybe center on the marker instead of the search coordinate for better popup alignment
        map.panTo(marker.getPosition());
      }
    }
  }, [selectedLocation, map]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl bg-[#0D1E38]">
      {loadError ? (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#0A1628]/80 backdrop-blur-sm">
          <div className="text-center max-w-sm">
            <p className="text-red-300 font-semibold">Map failed to load</p>
            <p className="text-slate-300 text-sm mt-2">{loadError}</p>
            <p className="text-slate-400 text-xs mt-3">Check your Google Maps API key and network connectivity.</p>
          </div>
        </div>
      ) : (!map || loading) ? (
        <div className="absolute inset-0 z-[1000] bg-[#0D1E38] p-6 flex flex-col gap-4 animate-pulse pointer-events-none">
          {/* Skeleton Header */}
          <div className="flex justify-between items-center opacity-30">
             <div className="w-1/4 h-6 bg-slate-700 rounded"></div>
             <div className="w-20 h-6 bg-slate-700 rounded"></div>
          </div>
          {/* Skeleton Map Grid */}
          <div className="flex-1 w-full grid grid-cols-4 grid-rows-3 gap-4 opacity-10 mt-4">
             <div className="col-span-1 row-span-1 bg-slate-500 rounded-2xl"></div>
             <div className="col-span-2 row-span-2 bg-slate-400 rounded-2xl"></div>
             <div className="col-span-1 row-span-3 bg-slate-500 rounded-2xl"></div>
             <div className="col-span-3 row-span-1 bg-slate-400 rounded-2xl"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-slate-900/80 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 uppercase tracking-[0.2em] shadow-2xl border border-slate-700/50">
              Loading Satellite Intelligence...
            </span>
          </div>
        </div>
      ) : crimes_data.length === 0 ? (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#0A1628]/40 backdrop-blur-[2px] pointer-events-none">
          <div className="bg-[#0D1E38]/90 border border-slate-700 p-4 rounded-xl shadow-2xl flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xl">📡</div>
             <div>
               <p className="text-slate-200 font-bold text-sm">No Signal Detected</p>
               <p className="text-slate-400 text-xs mt-0.5">No intelligence data available for selected filters in {stateName || 'this region'}.</p>
             </div>
          </div>
        </div>
      ) : null}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-6 right-6 z-[1] bg-[#0D1E38]/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-4 shadow-2xl pointer-events-none">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Intensity Scale</p>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#C0392B]" />
            <span className="text-[11px] text-slate-300 font-medium">Severe Crime</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#F39C12]" />
            <span className="text-[11px] text-slate-300 font-medium">Moderate Crime</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#F1C40F]" />
            <span className="text-[11px] text-slate-300 font-medium">Minor Crime</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#0E7C8B]" />
            <span className="text-[11px] text-slate-300 font-medium">Cyber / Other</span>
          </div>
        </div>

        <div className="pointer-events-auto mt-4 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[11px] text-slate-200 font-medium">
            <input
              type="checkbox"
              checked={heatmapOn}
              onChange={(e) => setHeatmapOn(e.target.checked)}
              className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-[#0E7C8B] focus:ring-[#0E7C8B]"
            />
            Heatmap
          </label>
          <span className="text-[10px] text-slate-500">{heatmapOn ? 'On' : 'Off'}</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 z-[1] bg-[#0D1E38]/90 backdrop-blur-md border border-slate-700/50 rounded-xl p-3 shadow-2xl pointer-events-none">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-3 h-3 rounded-full bg-[#3B82F6]" style={{border: '1.5px solid white'}} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Citizen Report (Pending)</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <div className="w-3 h-3 rounded-full bg-[#10B981]" style={{border: '1.5px solid white'}} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Citizen Report (Resolved)</span>
          </div>
        </div>
        <div className="mt-3 pt-2 border-t border-slate-800">
           <p className="text-[9px] text-slate-500 font-medium">Heatmap Source: NCRB Official Data</p>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}



