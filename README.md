# 🧠 CrimeMap AI  
### National Crime Intelligence & Decision Support System

**CrimeMap AI** is an **advanced OSINT-inspired platform** designed to transform regional crime data into actionable safety intelligence. Built for law enforcement and citizen awareness, it leverages interactive visualization, real-time news classification, and **trend analysis** to identify hotspots and enhance regional safety governance.

---

## 🔥 Key Highlights

- 🧠 **Real-time OSINT-based** crime intelligence feed
- 📍 **Interactive national crime heatmap** with deep-drill analytics
- 🛡️ **Citizen reporting** with integrated admin verification pipeline
- ⚡ **Full-stack architecture** powered by FastAPI + React

---

## 📸 Screenshots

### 🗺️ Crime Heatmap
![Map Placeholder](https://via.placeholder.com/800x400/0F172A/3B82F6?text=Crime+Hotspot+Map+Visual)

### 🧠 Intelligence Feed
![News Placeholder](https://via.placeholder.com/800x400/0F172A/F97316?text=Live+OSINT+Intelligence+Feed)

---

## 🚀 Core Features

### 📡 OSINT Intelligence Layer
*   **Real-Time Classification**: Automatically tags news incidents with **Severity Levels** (High/Medium/Low) using pattern-based markers.
*   **Source Credibility**: Distinguishes between **Verified OSINT** (from trusted national outlets) and signal analysis.
*   **Intelligent Caching**: Optimized with a 5-minute TTL caching layer to protect API integrity and ensure high responsiveness.
*   > **Note**: News data is powered by NewsAPI (free tier) and may have rate limits during high-frequency usage.

### 📍 Heatmap & Trend Analysis
*   **Hotspot Detection**: Dynamic crime density visualization across states and districts.
*   **Decision Support**: **Data-driven insights** highlighting "Actionable Intelligence" and "Community Gap Alerts."
*   **Regional Benchmarking**: Contrast safety scores between different states (e.g., Maharashtra vs Delhi) based on historical patterns.

### 📋 Citizen Intelligence Desk
*   **Verified Reporting**: Secure portal for citizens to submit incident reports.
*   **Moderation Pipeline**: Robust admin dashboard for intelligence verification and complaint lifecycle management.
*   **Privacy-First Governance**: Rejected or unverified reports are strictly filtered from public visibility.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios.
- **Backend**: FastAPI (Python), Uvicorn, Python-Multipart.
- **Security**: JWT Authentication, PBKDF2 Password Hashing (Passlib).
- **Data Engine**: Pandas for high-speed regional aggregation and analytical compute.

---

## ⚙️ Installation Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in a `.env` file:
   ```env
   NEWS_API_KEY=your_key_here
   JWT_SECRET=your_secret_here
   ```
5. Start the server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## 📖 Usage Instructions

### 👤 Citizen Flow
1. **Register/Login** as a standard user.
2. Explore the **Live Crime Intelligence Feed** for classified OSINT reports in your area.
3. Use the **Safety Map** to view verified hotspots.
4. Submit a report via the **Reporting Desk** and track its status in "My Reports."

### 👮 Admin Flow
1. **Login** with specialized admin credentials.
2. Access the **Intelligence Desk** to review, verify, or reject incoming reports.
3. View **Data Insights** to identify rising crime trends and resource gaps.

---

## 👥 Credits: Team CodeCrust

Crafted with passion by **Team CodeCrust**:

- **Shreya Nipunge** — [GitHub](https://github.com/Shreya-nipunge)
- **Kirtan Devadiga** — [GitHub](https://github.com/Kirtan-pc)
- **Mayuri Gade** — [GitHub](https://github.com/mayurigade-hub)
- **Shreya Dandekar** — [GitHub](https://github.com/shreyadandekar)
- **Lata Choudhary** — [GitHub](https://github.com/latachoudhary18)

---

## 📄 License Information

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---
*Built for Hackathon 2026 — Turning Data into Defenses.*
