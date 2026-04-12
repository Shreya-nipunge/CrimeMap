import { useState, useRef, useEffect } from 'react';
import { submitComplaint } from '../services/api';
import { FileWarning, CheckCircle, Search, User, Phone, Mail, Image as ImageIcon, X } from 'lucide-react';

export default function ComplaintForm({ prefillState, prefillDistrict }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    crime_type: 'Theft',
    description: '',
    location: '',
    district: prefillDistrict || '',
    lat: 0,
    lng: 0,
    state: prefillState || 'Maharashtra'
  });
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const searchRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Auto-fill input text if district was passed via URL context but places api hasn't resolved it yet
  useEffect(() => {
    if (prefillDistrict && searchRef.current && !searchRef.current.value) {
       searchRef.current.value = prefillDistrict;
       setFormData(f => ({ ...f, location: prefillDistrict }));
    }
  }, [prefillDistrict]);

  useEffect(() => {
    if (!searchRef.current || !window.google?.maps?.places) return;
    
    autocompleteRef.current = new window.google.maps.places.Autocomplete(searchRef.current, {
      fields: ['geometry', 'formatted_address', 'address_components'],
      componentRestrictions: { country: 'IN' },
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place?.geometry?.location) return;
      
      let district = '';
      place.address_components?.forEach(c => {
        if (c.types.includes('administrative_area_level_3') || c.types.includes('administrative_area_level_2') || c.types.includes('locality')) {
          district = district || c.long_name;
        }
      });

      setFormData(prev => ({
        ...prev,
        location: place.formatted_address,
        district: district || prev.district,
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      }));
    });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.location || !formData.description) return;
    
    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("phone", formData.phone);
      if (formData.email) payload.append("email", formData.email);
      payload.append("crime_type", formData.crime_type);
      payload.append("description", formData.description);
      payload.append("location", formData.location);
      payload.append("state", formData.state);
      payload.append("district", formData.district);
      payload.append("lat", formData.lat);
      payload.append("lng", formData.lng);
      
      if (imageFile) {
        payload.append("image", imageFile);
      }

      await submitComplaint(payload);
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      
      // Keep Name/Phone but clear rest
      setFormData(prev => ({
         ...prev, 
         description: '', 
         location: '', 
         district: prev.state === prefillState ? prefillDistrict : '',
         lat: 0, 
         lng: 0
      }));
      removeImage();
      if (searchRef.current) searchRef.current.value = prefillDistrict || '';
    } catch (err) {
      console.error("Complaint failed", err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#132240] border border-slate-700/50 rounded-2xl p-8 shadow-xl">
      <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-700">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <FileWarning className="text-blue-400" size={24} />
        </div>
        <div>
           <h2 className="text-xl font-bold text-slate-100">Incident Report Form</h2>
           <p className="text-xs text-slate-400">All fields marked with * are required.</p>
        </div>
      </div>

      {success ? (
        <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-500 bg-green-500/5 rounded-xl border border-green-500/20">
          <CheckCircle size={56} className="text-green-400 mb-4 drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]" />
          <h3 className="text-2xl font-bold text-green-50 mb-2">Intelligence Received</h3>
          <p className="text-slate-400 text-sm max-w-sm">Your intelligence report has been securely registered to the regional network and forwarded to administrators.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Identity Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-900/50 rounded-xl border border-slate-800">
             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Full Name *</label>
               <div className="relative">
                 <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="John Doe" />
               </div>
             </div>
             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Phone Number *</label>
               <div className="relative">
                 <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} required className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+91 9999999999" />
               </div>
             </div>
             <div className="md:col-span-2">
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email <span className="text-slate-600">(Optional)</span></label>
               <div className="relative">
                 <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="john@example.com" />
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Incident Type *</label>
               <select
                 value={formData.crime_type}
                 onChange={e => setFormData({...formData, crime_type: e.target.value})}
                 className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
               >
                 <option value="Theft">Theft</option>
                 <option value="Robbery">Robbery</option>
                 <option value="Vehicle Theft">Vehicle Theft</option>
                 <option value="Burglary">Burglary</option>
                 <option value="Cyber Crime">Cyber Crime</option>
                 <option value="Assault">Assault</option>
                 <option value="Other">Other IPC Crime</option>
               </select>
             </div>

             <div>
               <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Exact Location *</label>
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input
                   ref={searchRef}
                   type="text"
                   placeholder="Search precise location..."
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 pl-10 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
                   required
                 />
               </div>
             </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Detailed Description *</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Provide specific details about the incident, perpetrators, or stolen items..."
              className="w-full min-h-[120px] bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              required
            />
          </div>

          {/* Image Upload Block */}
          <div>
             <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Upload Evidence <span className="text-slate-600">(Optional Image)</span></label>
             {!imagePreview ? (
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-colors cursor-pointer group">
                  <div className="flex flex-col items-center">
                    <ImageIcon className="text-slate-500 group-hover:text-blue-400 transition-colors mb-2" size={28} />
                    <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300">Click to upload an image</span>
                    <span className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</span>
                  </div>
                  <input type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageChange} />
                </label>
             ) : (
                <div className="relative w-full h-48 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex items-center justify-center group">
                  <img src={imagePreview} alt="Evidence preview" className="max-h-full max-w-full object-contain" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <button type="button" onClick={removeImage} className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-red-600">
                       <X size={16} /> Remove Evidence
                     </button>
                  </div>
                </div>
             )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
          >
            {loading ? 'Transmitting Intelligence...' : 'Submit Official Report'}
          </button>
        </form>
      )}
    </div>
  );
}
