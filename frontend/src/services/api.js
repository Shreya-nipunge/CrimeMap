// frontend/src/services/api.js
// THE ONLY FILE that makes API calls. No fetch() or axios calls anywhere else.

import axios from "axios";

// Use environment variable for the base API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const apiClient = axios.create({
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

// GET /api/crimes — returns district-level aggregated crime values used for the heatmap.
// Optional query param: district (substring match).
export const getCrimes = async (filters = {}) => {
  const params = {};
  if (filters.region) params.region = filters.region;
  if (filters.crime_type) params.crime_type = filters.crime_type;
  if (filters.gender) params.gender = filters.gender;

  const response = await apiClient.get("/crimes", { params });
  return response.data;
};

// GET /api/summary — KPI card data
export const getSummary = async (year = null) => {
  const params = year ? { year } : {};
  const response = await apiClient.get("/summary", { params });
  return response.data;
};

// GET /api/by-type — bar chart data
export const getByType = async (year = null) => {
  const params = year ? { year } : {};
  const response = await apiClient.get("/by-type", { params });
  return response.data;
};

// GET /api/trend — monthly trend line data
export const getTrend = async () => {
  const response = await apiClient.get("/trend");
  return response.data;
};

// GET /api/hotspots — top 5 hotspot cards
export const getHotspots = async (year = null) => {
  const params = year ? { year } : {};
  const response = await apiClient.get("/hotspots", { params });
  return response.data;
};

// GET /api/news/:city — fetch crime news for a city
export const getNews = async (city) => {
  const response = await apiClient.get(`/news/${city}`);
  return response.data;
};
// POST /api/upload — upload a new CSV raw dataset to refresh the heatmap data
export const uploadDataset = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

// AUTH API calls
export const loginUser = async (email, password) => {
  const response = await apiClient.post("/login-user", { email, password });
  return response.data;
};

export const registerUser = async (email, password) => {
  const response = await apiClient.post("/register-user", { email, password });
  return response.data;
};

export const loginAdmin = async (email, password) => {
  const response = await apiClient.post("/login-admin", { email, password });
  return response.data;
};

export const registerAdmin = async (email, password) => {
  const response = await apiClient.post("/register-admin", { email, password });
  return response.data;
};
