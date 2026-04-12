// frontend/src/components/MapView.jsx
import { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, ShieldAlert, X } from 'lucide-react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';

const MAP_CONFIGS = {
  Maharashtra: { center: { lat: 19.7515, lng: 75.7139 }, zoom: 7 },
  Karnataka:   { center: { lat: 15.3173, lng: 75.7139 }, zoom: 7 },
  Delhi:       { center: { lat: 28.7041, lng: 77.1025 }, zoom: 10 },
  all:         { center: { lat: 21.7679, lng: 78.8718 }, zoom: 5 }
};

const EMPTY_ARRAY = [];

const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export default function MapView({ crimes = EMPTY_ARRAY, complaints = EMPTY_ARRAY, stateName, loading, selectedLocation, onLocationSelect, gapAlerts = EMPTY_ARRAY }) {
  const mapRef = useRef(null);
  const clustererRef = useRef(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [map, setMap] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['visualization', 'marker', 'places']
  });

  const onMapLoad = (mapInstance) => {
    setMap(mapInstance);
    mapRef.current = mapInstance;
  };

  useEffect(() => {
    if (map && selectedLocation) {
      map.panTo({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      map.setZoom(12);
      
      // Auto-open InfoWindow for the selected district if mapped in crimes
      if (selectedLocation.label && crimes.length > 0 && selectedLocation.source !== 'map_click') {
        let match = crimes.find(c => 
          c.district?.toLowerCase() === selectedLocation.label.toLowerCase() ||
          selectedLocation.label.toLowerCase().includes(c.district?.toLowerCase())
        );

        let foundComplaintType = null;

        // Geolocation Fallback: If no direct district string match, snap geographically!
        if (!match && selectedLocation.lat && selectedLocation.lng) {
            const validComplaints = Array.isArray(complaints) ? complaints.filter(c => c.lat && c.lng) : [];
            const nearbyComplaints = validComplaints.filter(c => haversine(selectedLocation.lat, selectedLocation.lng, Number(c.lat), Number(c.lng)) < 15);
            
            if (nearbyComplaints.length > 0) {
                // A user complaint is nearby! Open it without moving the user's camera
                foundComplaintType = nearbyComplaints.sort((a,b) => haversine(selectedLocation.lat, selectedLocation.lng, Number(a.lat), Number(a.lng)) - haversine(selectedLocation.lat, selectedLocation.lng, Number(b.lat), Number(b.lng)))[0];
            } else {
                // Snap map to nearest official district region
                const sortedCrimes = [...crimes].filter(c => c.lat && c.lng).sort((a,b) => haversine(selectedLocation.lat, selectedLocation.lng, Number(a.lat), Number(a.lng)) - haversine(selectedLocation.lat, selectedLocation.lng, Number(b.lat), Number(b.lng)));
                if (sortedCrimes.length > 0) {
                    match = sortedCrimes[0];
                    map.panTo({ lat: Number(match.lat), lng: Number(match.lng) });
                }
            }
        }

        if (foundComplaintType) {
            setSelectedMarker({ ...foundComplaintType, type: 'complaint' });
        } else if (match) {
          const alert = gapAlerts.find(a => a.district === match.district);
          setSelectedMarker({ ...match, type: 'crime', hasAlert: !!alert, alertDetails: alert });
        }
      }
    }
  }, [map, selectedLocation, crimes, gapAlerts]);

  useEffect(() => {
    if (map && !selectedLocation) {
      const config = MAP_CONFIGS[stateName] || MAP_CONFIGS.all;
      map.panTo(config.center);
      map.setZoom(config.zoom);
    }
  }, [map, stateName, selectedLocation]);

  // Ensure we compute these values safely whenever crimes array changes
  const { minScore, maxScore, rankedCrimes } = useMemo(() => {
    const validScores = crimes.map(c => Number(c.crime_score)).filter(s => !isNaN(s));
    if (validScores.length === 0) return { minScore: 0, maxScore: 1, rankedCrimes: [] };
    
    const min = Math.min(...validScores);
    const max = Math.max(...validScores);
    
    // Sort strictly ascending (lowest score = safest = #1)
    const sorted = [...crimes].sort((a, b) => Number(a.crime_score) - Number(b.crime_score));
    
    return { minScore: min, maxScore: max, rankedCrimes: sorted };
  }, [crimes]);

  const getHeatIcon = (crimeScore, hasAlert) => {
    const score = Number(crimeScore);
    const range = (maxScore - minScore) || 1;
    const normalized = (score - minScore) / range;
    
    console.log(`[MapView Debug] Validating - raw=${crimeScore}, parsed=${score}, min=${minScore}, max=${maxScore}, normalized=${normalized.toFixed(3)}`);
    
    const color = normalized > 0.66 ? '#ef4444' : normalized > 0.33 ? '#f97316' : '#eab308';
    const size = Math.min(Math.max((normalized * 25) + 20, 20), 45);

    const svg = `
      <svg width="${size + 20}" height="${size + 20}" viewBox="0 0 ${size + 20} ${size + 20}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${(size + 20) / 2}" cy="${(size + 20) / 2}" r="${size / 2}" fill="${color}" fill-opacity="0.3">
          <animate attributeName="r" from="${size / 2.5}" to="${size / 2.1}" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" from="0.4" to="0.1" dur="1.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="${(size + 20) / 2}" cy="${(size + 20) / 2}" r="${size / 3}" fill="${color}" stroke="white" stroke-width="2" />
        ${hasAlert ? `
          <circle cx="${(size + 20) / 2 + size / 4}" cy="${(size + 20) / 2 - size / 4}" r="8" fill="#ef4444" stroke="white" stroke-width="1.5" />
          <text x="${(size + 20) / 2 + size / 4}" y="${(size + 20) / 2 - size / 4 + 3}" font-family="Arial" font-size="8" font-weight="bold" fill="white" text-anchor="middle">!</text>
        ` : ''}
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size + 20, size + 20),
      anchor: new window.google.maps.Point((size + 20) / 2, (size + 20) / 2)
    };
  };

  const getComplaintIcon = (status) => {
    const color = status === 'resolved' ? '#10b981' : '#3b82f6';
    const svg = `
      <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8" cy="8" r="6" fill="${color}" stroke="white" stroke-width="2"/>
      </svg>
    `;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(16, 16),
      anchor: new window.google.maps.Point(8, 8)
    };
  };


  useEffect(() => {
    if (!map || loading || !isLoaded) return;

    if (clustererRef.current) {
      clustererRef.current.forEach(m => m.setMap(null));
    }
    clustererRef.current = [];

    const crimeMarkersList = crimes.map((crime) => {
      const marker = new window.google.maps.Marker({
        position: { lat: Number(crime.lat), lng: Number(crime.lng) },
        icon: getHeatIcon(crime.crime_score, gapAlerts.some(a => a.district === crime.district)),
        title: crime.district,
        map: map,
        zIndex: 1
      });

      marker.addListener('click', () => {
        const alert = gapAlerts.find(a => a.district === crime.district);
        setSelectedMarker({ ...crime, type: 'crime', hasAlert: !!alert, alertDetails: alert });
        if (onLocationSelect) {
            onLocationSelect({ lat: Number(crime.lat), lng: Number(crime.lng), label: crime.district, source: 'map_click' });
        }
      });

      return marker;
    });

    const validComplaints = Array.isArray(complaints) ? complaints : [];
    const complaintMarkersList = validComplaints.filter(c => c.lat && c.lng && c.status !== 'rejected').map((comp) => {
      const marker = new window.google.maps.Marker({
        position: { lat: Number(comp.lat), lng: Number(comp.lng) },
        icon: getComplaintIcon(comp.status),
        title: comp.crime_type,
        map: map,
        zIndex: 2
      });

      marker.addListener('click', () => {
        setSelectedMarker({ ...comp, type: 'complaint' });
        if (onLocationSelect) {
            onLocationSelect({ lat: Number(comp.lat), lng: Number(comp.lng), label: comp.district, source: 'map_click' });
        }
      });

      return marker;
    });

    // Save strictly to clean up later without clustering
    clustererRef.current = [...crimeMarkersList, ...complaintMarkersList];
    
    return () => {
      if (clustererRef.current) {
        clustererRef.current.forEach(m => m.setMap(null));
      }
    };
  }, [isLoaded, map, crimes, loading, gapAlerts, minScore, maxScore]);

  if (loadError) return <div className="w-full h-full bg-slate-900 flex items-center justify-center text-red-400">Error loading maps</div>;

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-700/30 shadow-2xl">
      {isLoaded ? (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: false,
            mapTypeControl: true,
            mapTypeControlOptions: {
              position: window.google.maps.ControlPosition.TOP_LEFT
            },
            zoomControl: true,
            zoomControlOptions: {
              position: window.google.maps.ControlPosition.LEFT_BOTTOM
            },
            streetViewControl: false,
            fullscreenControl: false,
            gestureHandling: 'greedy'
          }}
        >
          {selectedMarker && (
            <OverlayView
              position={{ lat: Number(selectedMarker.lat), lng: Number(selectedMarker.lng) }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="absolute -translate-x-1/2 -translate-y-[calc(100%+20px)] p-4 min-w-[280px] bg-[#0A1628] rounded-xl text-white border-2 border-slate-700/80 shadow-2xl z-50">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMarker(null);
                    if (onLocationSelect) onLocationSelect(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors border border-slate-700 pointer-events-auto"
                >
                  <X size={14} />
                </button>

                {selectedMarker.type === 'complaint' ? (
                  <>
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-700/50 pr-8">
                      <h4 className="text-sm font-black m-0 uppercase text-slate-100 flex-1">{selectedMarker.crime_type}</h4>
                      <span className={`text-[9px] ml-2 px-2 py-1 rounded font-black uppercase tracking-wider ${selectedMarker.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                        {selectedMarker.status}
                      </span>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 mb-3">
                      <p className="text-xs text-slate-300 italic">"{selectedMarker.description}"</p>
                    </div>
                    <div className="text-[10px] text-slate-500 space-y-1.5 flex flex-col items-start bg-slate-900/30 p-2 rounded">
                      <div className="flex"><span className="font-bold text-slate-400 w-10">By:</span> <span className="text-slate-300">{selectedMarker.name}</span></div>
                      <div className="flex"><span className="font-bold text-slate-400 w-10">Loc:</span> <span className="text-slate-300 line-clamp-1">{selectedMarker.district}</span></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-700/50 pr-8">
                      <h4 className="text-[15px] font-black m-0 text-white uppercase tracking-wider">{selectedMarker.district}</h4>
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-1 rounded font-black uppercase tracking-wider border border-slate-700">
                        {selectedMarker.state_name || stateName}
                      </span>
                    </div>
                    
                    {selectedMarker.hasAlert && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-3 w-full">
                        <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-black text-red-400 uppercase tracking-wider">⚠️ Under-Reporting Alert</p>
                          <p className="text-[10px] text-red-300 mt-1 leading-relaxed">System variance detected. High citizen reporting volume compared to official records.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-stretch gap-2 mb-4 w-full">
                      <div className="flex-1 bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Safety Index</div>
                        <div className="text-xl font-black text-slate-100">
                          {Math.max(0, 100 - Math.min(100, Math.floor(((Number(selectedMarker.crime_score) - minScore) / (maxScore - minScore || 1)) * 100)))}<span className="text-[11px] text-slate-500 ml-0.5">/100</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center">
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Regional Rank</div>
                        <div className="text-sm font-black text-blue-400 mt-0.5">
                          #{rankedCrimes.findIndex(c => c.district === selectedMarker.district) + 1}
                          <span className="text-xs text-slate-500 font-bold ml-1">of {rankedCrimes.length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full mb-1">
                       <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 px-1">Crime Breakdown</div>
                       <div className="grid grid-cols-2 gap-2 w-full">
                         {['murder', 'rape', 'robbery', 'thefts', 'burglary', 'cheating'].map(k => (
                           selectedMarker[k] !== undefined && selectedMarker[k] > 0 && (
                             <div key={k} className="flex justify-between items-center text-[10px] bg-slate-900/30 px-2.5 py-1.5 rounded border border-slate-800/50">
                               <span className="text-slate-400 capitalize font-medium">{k}</span>
                               <span className="text-slate-100 font-bold">{selectedMarker[k]}</span>
                             </div>
                           )
                         ))}
                       </div>
                    </div>
                  </>
                )}
                
                {/* Custom Pointer Tail */}
                <div className="absolute left-1/2 -bottom-[12px] -translate-x-1/2 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[12px] border-t-slate-700/80" />
                <div className="absolute left-1/2 -bottom-[9px] -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[10px] border-t-[#0A1628]" />
              </div>
            </OverlayView>
          )}
        </GoogleMap>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D1E38] space-y-4">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <p className="text-slate-400 text-sm font-medium animate-pulse">Initializing Geospatial Engine...</p>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 right-4 lg:bottom-6 lg:right-6 bg-[#0D1E38]/95 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-2xl pointer-events-none animate-in fade-in slide-in-from-right-4 duration-1000 min-w-[190px]">
        <h4 className="text-[11px] font-black text-slate-300 uppercase tracking-widest mb-3 pb-2 border-b border-slate-700/50">Intelligence Legend</h4>
        
        <div className="space-y-4">
          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Official Crime Intensity</span>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="text-[10px] font-semibold text-slate-200">Critical Risk (Top 33%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#f97316] shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                <span className="text-[10px] font-semibold text-slate-200">Elevated Risk (Mid 33%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                <span className="text-[10px] font-semibold text-slate-200">Moderate Risk (Bottom 33%)</span>
              </div>
            </div>
          </div>

          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 block border-t border-slate-700/50 pt-3">Citizen Core Reporting</span>
            <div className="space-y-2 flex flex-col pl-0.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-3 bg-[#3b82f6] rounded-t-full rounded-b-full shadow-[0_0_5px_rgba(59,130,246,0.5)] border border-slate-900" />
                <span className="text-[10px] font-semibold text-slate-200">Pending Investigation</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-3 bg-[#10b981] rounded-t-full rounded-b-full shadow-[0_0_5px_rgba(16,185,129,0.5)] border border-slate-900" />
                <span className="text-[10px] font-semibold text-slate-200">Resolved / Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const mapDarkStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#0d1e38" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0d1e38" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#4b5563" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#60a5fa" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#60a5fa" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#4b5563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0a1628" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#1e3a5f" }] }
];
