// frontend/src/components/FilterPanel.jsx
import { useEffect, useRef, useState } from 'react';
import { CRIME_TYPES, GENDERS } from '../lib/utils';
import { SlidersHorizontal, X, Search, ChevronDown, Globe, Map as MapIcon, LayoutGrid } from 'lucide-react';
import * as api from '../services/api';

const selectClass =
  'w-full lg:min-w-[170px] h-12 px-4 rounded-lg bg-slate-950 border border-slate-700 text-sm ' +
  'focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 ' +
  'appearance-none cursor-pointer hover:border-blue-400 transition-all duration-200 text-slate-200';

const searchClass =
  'w-full md:w-[280px] h-12 px-4 pl-10 rounded-lg bg-slate-950 border border-slate-700 ' +
  'text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 ' +
  'focus:ring-2 focus:ring-blue-500/30 transition-all duration-200';

const STATE_REGIONS = {
  'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Chhatrapati Sambhajinagar', 'Dharashiv', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
  'Karnataka': ['Bagalkote', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagara', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Hubballi-Dharwad', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mangaluru', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayanagara', 'Vijayapura', 'Yadgir'],
  'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi']
};

const DEFAULT_FILTERS = { state: 'all', crime_type: '', region: '', year: '', gender: '' };

export default function FilterPanel({ filters, onFilterChange, onLocationSelect }) {
  const f = filters ?? DEFAULT_FILTERS;
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    if (f.state && f.state !== 'all') {
       const list = STATE_REGIONS[f.state] || [];
       setDistricts(list.sort());
    } else {
       // Aggregate ALL districts across all states for National Search
       const allList = Object.values(STATE_REGIONS).flat();
       setDistricts([...new Set(allList)].sort());
    }
  }, [f.state]);

  const handleChange = (key, value) => {
    if (key === 'state') {
       onFilterChange({ [key]: value, region: '' });
    } else {
       onFilterChange({ [key]: value });
    }
  };

  const clearAll = () => onFilterChange(DEFAULT_FILTERS);

  const hasActive = [f.crime_type, f.region, f.year, f.gender].some(Boolean) || f.state !== 'all';

  const searchRef = useRef(null);
  const autocompleteRef = useRef(null);

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
        if (setupAutocomplete()) window.clearInterval(interval);
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
    <div className="bg-[#0D1E38] border border-slate-700/30 rounded-2xl p-4 lg:p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex flex-col gap-4">
        
        {/* ROW 1: State, Region, Crime Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="relative group w-full">
            <select
              className={selectClass}
              value={f.state}
              onChange={(e) => handleChange('state', e.target.value)}
            >
              <option value="all">All States</option>
              {Object.keys(STATE_REGIONS).map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
          </div>

          <div className="relative group w-full">
            <select
              className={`${selectClass} pl-9`}
              value={f.region}
              onChange={(e) => handleChange('region', e.target.value)}
            >
              <option value="">Search District...</option>
              {districts.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
            <MapIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" size={14} />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
          </div>

          <div className="relative group w-full">
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
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
          </div>
        </div>

        {/* ROW 2: Year, Gender, Search, Reset */}
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
          
          <div className="grid grid-cols-2 gap-4 w-full lg:w-1/3">
            <div className="relative group w-full">
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
            </div>

            <div className="relative group w-full">
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
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-blue-400 transition-colors" size={16} />
            </div>
          </div>

          <div className="flex-grow relative group w-full lg:w-auto">
            <input
              ref={searchRef}
              type="text"
              placeholder="Search location..."
              className={searchClass}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-blue-400 transition-colors" size={16} />
          </div>

          {hasActive && (
            <button
              onClick={clearAll}
              className="px-6 h-12 rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-600/20 transition-all duration-200 shrink-0 w-full lg:w-auto"
            >
              <X size={16} />
              Reset
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
