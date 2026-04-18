// frontend/src/services/api.js
// THE ONLY FILE that makes API calls. No fetch() or axios calls anywhere else.

import axios from "axios";

// Use environment variable for the base API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// GET /api/benchmarks
export const getBenchmarks = async () => {
  const response = await apiClient.get("/analytics/benchmarks");
  return response.data;
};

// GET /api/crimes — returns district-level aggregated crime values used for the heatmap.
// Optional query param: district (substring match).
export const getCrimes = async (filters = {}) => {
  const params = {};
  if (filters.state) params.state = filters.state;
  if (filters.region) params.region = filters.region;
  if (filters.crime_type) params.crime_type = filters.crime_type;
  if (filters.gender) params.gender = filters.gender;
  if (filters.view_mode) params.view_mode = filters.view_mode;

  const response = await apiClient.get("/crimes", { params });
  return response.data;
};

// GET /api/summary — KPI card data
export const getSummary = async (state = "Maharashtra", year = null) => {
  const params = { state };
  if (year) params.year = year;
  const response = await apiClient.get("/summary", { params });
  return response.data;
};

// GET /api/by-type — bar chart data
export const getByType = async (state = "Maharashtra", year = null) => {
  const params = { state };
  if (year) params.year = year;
  const response = await apiClient.get("/by-type", { params });
  return response.data;
};

// GET /api/trend — monthly trend line data
export const getTrend = async (state = "Maharashtra") => {
  const params = { state };
  const response = await apiClient.get("/trend", { params });
  return response.data;
};

// GET /api/hotspots — top 5 hotspot cards
export const getHotspots = async (state = "Maharashtra", year = null) => {
  const params = { state };
  if (year) params.year = year;
  const response = await apiClient.get("/hotspots", { params });
  return response.data;
};

// GET /api/news?q={query} — fetch crime news
export const getNews = async (query) => {
  const response = await apiClient.get("/news", { params: { q: query } });
  return response.data;
};
// POST /api/upload-csv — upload a new CSV raw dataset to refresh the heatmap data
export const uploadDataset = async (file, state) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("state", state);

  const response = await apiClient.post("/upload-csv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getSafetyScore = async (district, state = "Maharashtra") => {
  const response = await apiClient.get("/safety-score", { params: { district, state } });
  return response.data;
};

export const getAdminInsights = async (state = "Maharashtra", year = null) => {
  const params = { state };
  if (year) params.year = year;
  const response = await apiClient.get("/admin/insights", { params });
  return response.data;
};

export const submitComplaint = async (data) => {
  // If data is a FormData object (for images)
  const isFormData = data instanceof FormData;
  const response = await apiClient.post("/complaints", data, {
    headers: isFormData ? { "Content-Type": "multipart/form-data" } : {}
  });
  return response.data;
};

export const getComplaints = async (state = null, status = null) => {
  const params = {};
  if (state) params.state = state;
  if (status) params.status = status;
  const response = await apiClient.get("/complaints", { params });
  return response.data;
};

export const getAdminComplaints = async () => {
  const response = await apiClient.get('/complaints', { params: { include_rejected: true } });
  return response.data;
};

export const getMyComplaints = async () => {
  const response = await apiClient.get('/my-complaints');
  return response.data;
};

export const updateComplaintStatus = async (id, status = 'VERIFIED', reason = null) => {
  let endpoint = `/complaints/${id}/verify`;
  if (status === 'UNDER_REVIEW') endpoint = `/complaints/${id}/review`;
  if (status === 'REJECTED' || status === 'rejected') endpoint = `/complaints/${id}/reject`;
  if (status === 'VERIFIED' || status === 'resolved') endpoint = `/complaints/${id}/verify`;

  const payload = (status === 'REJECTED' || status === 'rejected') ? { admin_notes: reason || 'Rejected by Admin' } : {};
  const response = await apiClient.patch(endpoint, payload);
  return response.data;
};

// AUTH API calls
export const loginUser = async (email, password) => {
  const response = await apiClient.post("/login-user", { email, password });
  return response.data;
};

export const registerUser = async (email, password, name) => {
  const response = await apiClient.post("/register-user", { email, password, name });
  return response.data;
};

export const loginAdmin = async (email, password) => {
  const response = await apiClient.post("/login-admin", { email, password });
  return response.data;
};

export const registerAdmin = async (email, password, name) => {
  const response = await apiClient.post("/register-admin", { email, password, name });
  return response.data;
};
