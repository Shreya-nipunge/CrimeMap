// frontend/src/components/MapView.jsx
import { useEffect, useRef, useState } from 'react';
import { Loader } from "@googlemaps/js-api-loader";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_CENTER = { lat: 19.3919, lng: 72.8397 };
const DEFAULT_ZOOM = 12;

export default function MapView({ crimes, loading, selectedLocation, onLocationSelect }) {
  const crimes_data = crimes || [];
  const containerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [heatmapOn, setHeatmapOn] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const clustererRef = useRef(null);
  const markersRef = useRef([]);
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
    markersRef.current = [];
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

      marker.addListener("click", () => {
        const content = `
          <div style="font-family:'Inter', sans-serif; min-width:220px; padding: 6px; color: #111">
            <div style="margin-bottom:8px; border-bottom: 1px solid #eee; padding-bottom: 4px">
              <h3 style="margin:0; font-size:14px; font-weight:700; color:#0E3A64">${c.district}</h3>
              <p style="margin:2px 0 0; font-size:11px; color:#64748b">Crime Score: <strong>${score}</strong></p>
            </div>
            <div style="font-size:11px; color:#334155; line-height:1.4">
              <p style="margin:0"><strong>Murder:</strong> ${c.murder}</p>
              <p style="margin:0"><strong>Robbery:</strong> ${c.robbery}</p>
              <p style="margin:0"><strong>Thefts:</strong> ${c.thefts}</p>
              <p style="margin:0"><strong>Vehicle Theft:</strong> ${c.vehicle_theft}</p>
              <p style="margin:0"><strong>Burglary:</strong> ${c.burglary}</p>
              <p style="margin:0"><strong>Cheating:</strong> ${c.cheating}</p>
              <p style="margin:0"><strong>Rape:</strong> ${c.rape}</p>
            </div>
          </div>
        `;
        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);
      });

      return marker;
    });

    markersRef.current = newMarkers;
    if (clustererRef.current && newMarkers.length > 0) {
      clustererRef.current.clearMarkers();
      clustererRef.current.addMarkers(newMarkers);
    }
  }, [crimes_data, map, heatmapOn]);

  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((marker) => {
      const score = marker.get('score');
      marker.setVisible(heatmapOn);
      marker.setMap(heatmapOn ? map : null);
    });
  }, [heatmapOn, map]);

  // Handle selectedLocation (panning/zooming from Hotspot cards or Search Bar)
  useEffect(() => {
    if (selectedLocation && map && window.google) {
      const pos = { lat: Number(selectedLocation.lat), lng: Number(selectedLocation.lng) };
      map.panTo(pos);
      map.setZoom(11); // Slightly closer zoom

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
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#0A1628]/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-slate-400 text-sm">
            <div className="w-5 h-5 border-2 border-[#0E7C8B] border-t-transparent rounded-full animate-spin" />
            Initializing Satellite Intelligence…
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

      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}



