// frontend/src/components/FilterPanel.jsx
import { useEffect, useRef } from 'react';
import { CRIME_TYPES, GENDERS } from '../lib/utils';
import { SlidersHorizontal, X, Search, ChevronDown } from 'lucide-react';

const selectClass =
  'w-full lg:min-w-[180px] h-12 px-4 rounded-lg bg-slate-950 border border-slate-700 text-sm ' +
  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ' +
  'appearance-none cursor-pointer hover:border-blue-400 transition-all duration-200 text-slate-200';

const inputClass =
  'bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-4 h-12 ' +
  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ' +
  'placeholder-slate-600 transition-all [color-scheme:dark]';

const searchClass =
  'w-full md:w-[280px] h-12 px-4 pl-10 rounded-lg bg-slate-950 border border-slate-700 ' +
  'text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 ' +
  'focus:ring-2 focus:ring-blue-500/30 transition-all duration-200';

const DEFAULT_FILTERS = { crime_type: '', region: '', year: '', gender: '' };

export default function FilterPanel({ filters, onFilterChange, onLocationSelect }) {
  const f = filters ?? DEFAULT_FILTERS;

  const handleChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const clearAll = () => onFilterChange(DEFAULT_FILTERS);

  const hasActive = [f.crime_type, f.region, f.year, f.gender].some(Boolean);

  const searchRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Initialize Places Autocomplete when the Maps JS API is available.
  useEffect(() => {
    if (!searchRef.current || !onLocationSelect) return;

    const setupAutocomplete = () => {
      if (!window.google?.maps?.places) return false;

      autocompleteRef.current = new window.google.maps.places.Autocomplete(searchRef.current, {
        fields: ['geometry', 'formatted_address'],
        componentRestrictions: { country: 'IN' },
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place?.geometry?.location) return;
        const location = place.geometry.location;
        onLocationSelect({ lat: location.lat(), lng: location.lng(), label: place.formatted_address });
      });

      return true;
    };

    if (!setupAutocomplete()) {
      const interval = window.setInterval(() => {
        if (setupAutocomplete()) {
          window.clearInterval(interval);
        }
      }, 500);

      return () => window.clearInterval(interval);
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onLocationSelect]);

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-700 px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all duration-300">
      <div className="flex flex-col md:flex-row items-center gap-4 lg:gap-6 w-full lg:w-auto">
        <div className="flex items-center gap-3 flex-shrink-0 self-start md:self-center">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <SlidersHorizontal size={16} className="text-blue-400" />
          </div>
          <span className="text-sm font-medium text-slate-400 tracking-wide uppercase">Filters:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full md:w-auto">
          {/* Crime Type */}
          <div className="relative group">
            <select
              className={selectClass}
              value={f.crime_type}
              onChange={(e) => handleChange('crime_type', e.target.value)}
            >
              <option value="">Crime Type</option>
              {CRIME_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 group-hover:text-blue-400 transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>

          {/* Region */}
          <div className="relative group">
            <select
              className={selectClass}
              value={f.region}
              onChange={(e) => handleChange('region', e.target.value)}
            >
              <option value="">Region</option>
              {['Thane', 'Mumbai', 'Navi Mumbai', 'Pune', 'Nagpur', 'Nashik'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 group-hover:text-blue-400 transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>

          {/* Year Filter */}
          <div className="relative group">
            <select
              className={selectClass}
              value={f.year}
              onChange={(e) => handleChange('year', e.target.value)}
            >
              <option value="">All Years</option>
              {['2017', '2018', '2019', '2020', '2021', '2022'].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 group-hover:text-blue-400 transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>

          {/* Victim Gender */}
          <div className="relative group">
            <select
              className={selectClass}
              value={f.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
            >
              <option value="">Gender</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500 group-hover:text-blue-400 transition-colors">
              <ChevronDown size={18} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto justify-end">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={18} />
          <input
            ref={searchRef}
            placeholder="Search location…"
            className={searchClass}
          />
        </div>

        {hasActive && (
          <button
            onClick={clearAll}
            className="flex items-center justify-center gap-2 h-12 px-5 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all border border-red-400/20 whitespace-nowrap w-full sm:w-auto"
          >
            <X size={16} /> Clear All
          </button>
        )}
      </div>
    </div>
  );
}

