// frontend/src/pages/AdminUpload.jsx
// Admin interface to upload a new IPC crime dataset CSV and trigger reprocessing.

import { useState, useEffect } from 'react';
import { uploadDataset } from '../services/api.js';
import { useNavigate, Link } from 'react-router-dom';

export default function AdminUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) {
      navigate('/');
    } else if (role !== 'admin') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return;

    setLoading(true);
    setStatus('Uploading dataset...');

    try {
      const result = await uploadDataset(file);
      setStatus(result.status ?? 'Dataset uploaded successfully.');
    } catch (err) {
      console.error(err);
      setStatus('Upload failed. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white font-sans flex flex-col">
      {/* Navbar */}
      <header className="h-16 flex-shrink-0 bg-[#0D1E38] border-b border-slate-700/30 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-slate-200 bg-[#C0392B] px-3 py-1 rounded-full uppercase tracking-wider">
            Admin Mode
          </span>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('role');
              navigate('/');
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-xs font-semibold text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto mt-8 bg-[#132240] border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <span className="text-2xl">📤</span> Admin Dataset Upload
          </h1>
          <p className="text-sm text-slate-400 mb-8 border-b border-slate-700/50 pb-6">
            Upload a new IPC dataset CSV (2017–2022). The system will securely reprocess the data and refresh the regional heatmap mapping.
          </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-semibold text-slate-200">
            Select CSV file
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0D1E38] px-3 py-2 text-sm text-slate-100"
            />
          </label>

          <button
            type="submit"
            disabled={!file || loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0E7C8B] hover:bg-[#0B5A6A] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading…' : 'Upload Dataset'}
          </button>

          {status && (
            <div className={`mt-6 p-4 rounded-lg text-sm border ${
              status.includes('failed') || status.includes('error') 
                ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}>
              {status}
            </div>
          )}
        </form>
        </div>
      </div>
    </div>
  );
}
