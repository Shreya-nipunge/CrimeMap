// frontend/src/components/SearchBar.jsx
// Provides a Google Places Autocomplete search box that recenters the map when a location is selected.

import { useEffect, useRef } from 'react';

export default function SearchBar({ map, onPlaceSelected }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!map || !window.google || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "formatted_address"],
      componentRestrictions: { country: "IN" },
    });

    autocomplete.bindTo("bounds", map);

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      const location = place.geometry.location;
      onPlaceSelected?.({
        lat: location.lat(),
        lng: location.lng(),
        label: place.formatted_address,
      });
    });

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [map, onPlaceSelected]);

  return (
    <div className="absolute top-6 left-6 z-[2] w-[260px]">
      <input
        ref={inputRef}
        placeholder="Search Maharashtra..."
        className="w-full rounded-xl border border-slate-700/60 bg-[#0D1E38]/80 px-4 py-2 text-sm text-slate-100 outline-none focus:border-[#0E7C8B] focus:ring-2 focus:ring-[#0E7C8B]/40"
      />
    </div>
  );
}
