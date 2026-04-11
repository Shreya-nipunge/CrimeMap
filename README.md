# 🚔 CrimeMap

A comprehensive crime analytics and visualization solution. CrimeMap enables stakeholders to analyze crime-related data, identify patterns, and visualize hotspots across Maharashtra districts to support informed decision-making.

---

## 📝 Problem Statement
Develop a solution that enables the analysis and visualization of crime-related data to identify patterns and areas with higher crime frequency. The solution should categorize incidents based on relevant legal classifications and present insights through clear visual representations that highlight crime hotspots. It should also allow users to explore and filter the data using parameters such as type of crime, time period, and other relevant factors, helping stakeholders better understand crime trends and support informed decision-making.

---

## ✨ Features

- **📍 Interactive Heatmaps**: Google Maps integration with weighted intensity markers based on crime severity.
- **📊 Advanced Analytics**: Real-time charts (Bar, Pie, Trends) showing crime distribution and yearly patterns.
- **🔥 Hotspot Detection**: Backend algorithm that calculates a `weighted crime score` (e.g., Murder=5, Robbery=4) to identify high-risk zones.
- **🔍 Multi-Level Filtering**: Search and filter by District, Year, Crime Type, and Gender.
- **🗞️ Real-time Intelligence**: Integrated NewsAPI to fetch local crime reports and AI-driven safety insights.
- **🔐 Role-Based Access**: Secure authentication with specific dashboards for Users and Administrators.
- **📁 Data Ingestion**: Admin portal for uploading and processing IPC crime datasets.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **Maps**: Google Maps JavaScript API (Visualization & Places)
- **Icons**: Lucide React
- **Viz**: Recharts / Chart.js

### Backend
- **Engine**: FastAPI (Python)
- **Processing**: Pandas & NumPy
- **Auth**: JWT (JSON Web Tokens)
- **Storage**: Local JSON (DB) & CSV (Datasets)
