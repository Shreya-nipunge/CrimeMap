# 🗺️ CrimeMap AI
### National Crime Intelligence & Decision Support System
*Built for Hackathon 2026 — Turning Data into Defenses.*
*Crafted with passion by **Team CodeCrust***

---

CrimeMap transforms fragmented regional crime data into a live, actionable safety intelligence grid. Designed for both law enforcement and everyday citizens, it fuses open-source intelligence, interactive heatmap visualization, a 4-state verified citizen reporting pipeline, and a passive under-reporting detection layer into a single decision-ready platform.

---

## ✨ Key Highlights

| | Feature | Description |
|---|---|---|
| 📡 | **Ranked OSINT Intelligence Feed** | Real-time crime news scored by source trust + incident severity and presented as top-signal articles |
| 🌐 | **Interactive Heatmap** | National crime density visualization with district-level drill-down, safety scores, and regional ranking |
| 🧠 | **Passive Under-Reporting Detection** | Weighted complaint signal algorithm flags jurisdictions where citizen intel far exceeds official records |
| 🏛️ | **Admin Responsiveness Intelligence** | Tracks and visualizes governance bottlenecks — districts with low complaint clearance rates get ⚠️ flagged on the map |
| 🙋 | **4-State Citizen Reporting Lifecycle** | `UNVERIFIED → UNDER_REVIEW → VERIFIED → REJECTED` with full audit trail, evidence upload, and privacy controls |
| ⚙️ | **Full-Stack Architecture** | FastAPI backend + React frontend, JWT-secured, file-serving for evidence, production-ready |

---

## Screenshots

### 🗺️ Crime Heatmap
![Crime Heatmap](./assets/Heatmap.png)

### 🧠 Intelligence Feed
![Intelligence Feed](./assets/Intelligence-feed.png)

---

## 🔍 Core Features

### 📡 Ranked OSINT Intelligence Layer
The platform ingests live news signals, scores them, and surfaces only the highest-signal articles.

- **Real-time severity scoring** — articles are ranked using keyword intensity (`murder`, `rape`, `robbery`) and source trust tiers
- **Top-6 intelligence filter** — only the six highest-ranked articles are presented, eliminating noise
- **Intelligent caching** — 5-minute TTL cache protects API rate limits and ensures sub-second responsiveness

> **Note:** News data is powered by NewsAPI (free tier). High-frequency usage may encounter rate limits.

### 🗺️ Heatmap & Trend Analysis
- **Dynamic hotspot detection** — crime density rendered across states and districts in real time with animated pulse markers
- **Safety Index & Regional Rank** — each district popup shows a calculated safety score (0–100) and its statewide rank
- **Dual badge overlay** — map markers carry a red `!` for under-reporting anomalies and an orange `⚠️` for low admin responsiveness, always visible without clicking
- **Decision support overlays** — highlights "Actionable Intelligence Zones" and "Community Gap Alerts"

### 🧠 Passive Intelligence Layer (Under-Reporting Detection)
- **Weighted complaint signal** — complaints are scored by status: `UNVERIFIED=1`, `UNDER_REVIEW=2`, `VERIFIED=3`
- **Anomaly detection** — districts where signal strength significantly exceeds official crime scores are automatically flagged as potential under-reporting zones
- **Zero ML required** — entirely deterministic algorithm, no external model dependencies

### 🏛️ Admin Responsiveness Intelligence
- **Response rate computation** — system calculates the ratio of validated-to-pending intel per jurisdiction
- **Visual governance scoring** — districts with a critically low response rate are marked with a persistent `⚠️` badge directly on the map marker
- **InfoWindow details** — clicking a flagged district reveals the exact response rate percentage and an explanation of the bottleneck

### 🙋 Citizen Intelligence Desk
- **4-state verification lifecycle** — `UNVERIFIED → UNDER_REVIEW → VERIFIED → REJECTED` with color-coded map pins (Purple/Blue/Green/Red)
- **Soft-enforced admin flow** — admins can fast-path to `VERIFIED` directly or step through review; all transitions are timestamped
- **Pending-time visibility** — admin table shows "Pending for X hours/days" for unresolved reports, creating accountability pressure
- **Evidence upload** — citizens can attach image evidence; files are stored server-side and rendered in the admin Intelligence Briefing
- **Privacy-first reporting** — users toggle whether their detailed description is shared on the public map; admins always retain full access
- **My Reports dashboard** — citizens track their submission history with live lifecycle status, age tracking, and reasoning for rejections

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Axios |
| **Backend** | FastAPI (Python), Uvicorn, Python-Multipart |
| **Auth & Security** | JWT Authentication, PBKDF2 Password Hashing (Passlib) |
| **Data Engine** | Pandas — regional aggregation and analytical compute |
| **Storage** | JSON flat-file DB (no external database dependency) |
| **File Serving** | FastAPI StaticFiles — persisted evidence uploads via `/uploads` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher
- Python 3.10 or higher

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env and fill in your values:
#   NEWS_API_KEY=your_newsapi_key_here
#   JWT_SECRET=your_jwt_secret_here

# 5. Start the development server
python -m uvicorn app.main:app --reload
```

Backend will be live at `http://localhost:8000`

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Frontend will be live at `http://localhost:5173`

---

## 📖 Usage Guide

### 👤 Citizen Flow
1. Register or log in as a standard user
2. **Explore the Intelligence Feed** — browse ranked OSINT crime articles filtered by source trust and severity
3. **Check the Safety Map** — view verified hotspots, under-reporting alerts (`!`), and governance warnings (`⚠️`) on the live heatmap
4. **Submit a Report** via the Reporting Desk — attach evidence images, optionally keep your description private, and track the full verification lifecycle under *My Reports*

### 🔐 Admin / Law Enforcement Flow
1. Log in using specialized admin credentials
2. **Access the Intelligence Desk** — review incoming citizen reports with full reporter details, GPS coordinates, and attached evidence
3. **Manage the Lifecycle** — step reports through `Under Review` or fast-path `Verify`; reject with optional reasoning
4. **Monitor Accountability** — the "Pending for X" column and responsiveness analytics immediately surface governance backlogs

---

## 🏗️ Architecture Notes

- **No heavy databases** — all data persisted in JSON files (`complaints_db.json`, `auth_db.json`) for zero-dependency deployment
- **In-memory intelligence** — all enrichment metrics (admin responsiveness, signal strength) computed on-demand from `_processed_data` cache
- **Stateless backend** — cache is invalidated and re-enriched on each complaint state change, keeping analytics always fresh
- **Privacy by design** — citizen PII (name, phone, email) is stored securely but masked from all public-facing API surfaces and map overlays

---

## 👥 Team

**Team CodeCrust — Hackathon 2026**

| Name | GitHub |
|---|---|
| Shreya Nipunge | [@Shreya-nipunge](https://github.com/Shreya-nipunge) |
| Kirtan Devadiga | [@Kirtan-pc](https://github.com/Kirtan-pc) |
| Mayuri Gade | [@mayurigade-hub](https://github.com/mayurigade-hub) |
| Shreya Dandekar | [@shreyadandekar](https://github.com/shreyadandekar) |
| Lata Choudhary | [@latachoudhary18](https://github.com/latachoudhary18) |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](./LICENSE) file for details.
