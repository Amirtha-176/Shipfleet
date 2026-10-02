# ShipFleet Management System — FleetOps Maritime
### Intelligent Shipping Fleet Management & Voyage Monitoring Platform

[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v22-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com/)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--Time-black.svg)](https://socket.io/)

---

## 1. Project Overview

**ShipFleet Management System (FleetOps Maritime)** is an enterprise-grade MERN-stack platform engineered for global shipping companies and vessel operators to manage commercial fleets, international voyages, maritime routing, bunker fuel consumption, cargo manifests, classification surveys, crew rosters, and live telemetry tracking in real time.

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Leaflet GIS (OpenStreetMap & CartoDB Dark Matter), Axios, Context API.
- **Backend**: Node.js, Express.js REST API, TypeScript, JWT (JSON Web Tokens), bcryptjs password hashing, RBAC middleware.
- **Database & Persistence**: MongoDB file-persistent document engine with schema validation, relationships, and ObjectId semantics.
- **Caching**: Redis-compatible high-performance caching layer with automated TTL and invalidation triggers on database mutations.
- **Real-Time Communication**: Socket.io WebSocket server providing live AIS vessel GPS telemetry updates, user presence tracking, and real-time operational activity streams.
- **DevOps & Containers**: Multi-service Dockerfile and `docker-compose.yml` (App, MongoDB, Redis).

---

## 3. Demo Login Credentials (Seeded into MongoDB)

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@shipfleet.com` | `Admin@123` | Full access: Vessels CRUD, User Administration, Maintenance Scheduling, Crew Roster, Reports. |
| **Operator** | `operator@shipfleet.com` | `Operator@123` | Operations: Voyage scheduling, Cargo assignment, Fuel bunkering logging, Alert resolution. |
| **Viewer** | `viewer@shipfleet.com` | `Viewer@123` | Read-only: Fleet monitoring, vessel inspection, voyage tracking. No edit/delete access. |

---

## 4. Key Functional Modules

1. **Maritime Landing Page**:
   - Hero dashboard presentation with 50+ Vessels, 120+ Voyages, 35+ Active Routes statistics.
   - Distinct **Viewer Login** and **Admin / Operator Login** access gates.
   - Comprehensive workflow explanation: Authenticate → Monitor Fleet → Manage Voyages → Manage Vessels → Manage Operations → Analyze Performance.
2. **Dashboard & KPIs**:
   - Total Vessels, Active Vessels, In-Transit, Docked, Maintenance, and Idle status badges.
   - Aggregated Fuel Consumption (MT), Fuel Cost (USD), Cargo In Transit (MT), and Active Alerts.
   - Top-performing vessels ranked by fuel efficiency (NM/MT).
   - Real-time Socket.io activity feed with instant user action notifications.
3. **Fleet & Vessel Management**:
   - Full CRUD: Add vessel, Edit vessel, Decommission/Delete vessel with confirmation dialog.
   - Vessel profile details: Deadweight Tonnage, Gross Tonnage, LOA, Beam, Draft, Engine Rating, Bunker Capacity, Surveys, and P&I Insurance.
4. **Voyage Scheduling & Cargo Assignment**:
   - Origin and Destination coordinates with ocean waypoints.
   - Real-time status updater: Planned, Scheduled, In Transit, Arrived, Completed, Delayed (with weather/congestion reason).
   - Dynamic cargo assignment linking bills of lading to dispatched voyages.
5. **Route Tracking (Leaflet GIS)**:
   - Interactive world map with rotatable vessel markers reflecting true nautical headings.
   - Status-colored icons: Cyan (In Transit), Emerald (Docked), Amber (Maintenance), Red (Delayed).
   - Polyline maritime routes from origin to destination.
   - Background telemetry simulation updating GPS coordinates every 6 seconds.
6. **Fuel Operations & Bunkering**:
   - Fuel logging modal with automatic calculations:
     - `Total Cost = Quantity × Unit Price`
     - `Fuel Efficiency = Distance Travelled / Fuel Consumed` (NM/MT)
   - Bunkering history with supplier notes and fuel grade filters (VLSFO, MGO, LNG, HFO).
7. **Maintenance & Class Surveys**:
   - Preventative, Corrective, Emergency, and Survey work orders.
   - Priority classification (Critical, High, Medium, Low) with automated operational alerts.
   - Technician logging, parts used, cost accounting, and completion sign-off.
8. **Port Directory**:
   - 15 world container & bulk terminals with UN/LOCODE codes, GPS coordinates, operating hours, and capacities.
9. **Crew Management**:
   - Marine crew roster: Captains, Chief Engineers, Officers, and Ratings.
   - Vessel assignment, STCW certifications, contract expiry tracking.
10. **Operational Alerts Center**:
    - Fuel level alerts, delay notices, maintenance deadlines, and class survey warnings.
    - Operator/Admin "Resolve Alert" workflow with audit attribution.
11. **Reports & One-Click CSV Export**:
    - Downloadable CSVs for Fleet, Voyages, Fuel, and Maintenance.
12. **User Administration (Admin Only)**:
    - User creation, password hashing, role tier promotion, account disable/activate, and audit logging.

---

## 5. Docker Deployment

To launch the entire platform with Docker Compose:

```bash
docker compose up --build
```

To stop all services:

```bash
docker compose down
```

---

## 6. Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run dev server**:
   ```bash
   npm run dev
   ```

3. **Open browser**:
   Navigate to `http://localhost:3000`.

---

## 7. REST API Endpoints Summary

- **Authentication**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `PUT /api/auth/change-password`
- **Dashboard**: `GET /api/dashboard/stats`, `GET /api/dashboard/analytics`
- **Vessels**: `GET /api/vessels`, `GET /api/vessels/:id`, `POST /api/vessels` (Admin), `PUT /api/vessels/:id` (Admin), `DELETE /api/vessels/:id` (Admin)
- **Voyages**: `GET /api/voyages`, `GET /api/voyages/:id`, `POST /api/voyages`, `PATCH /api/voyages/:id/status`, `POST /api/voyages/:id/assign-cargo`
- **Tracking**: `GET /api/tracking`, `PUT /api/tracking/:vesselId`
- **Cargo**: `GET /api/cargo`, `POST /api/cargo`, `PUT /api/cargo/:id`, `DELETE /api/cargo/:id`
- **Fuel**: `GET /api/fuel`, `POST /api/fuel`, `GET /api/fuel/analytics`
- **Maintenance**: `GET /api/maintenance`, `POST /api/maintenance`, `PUT /api/maintenance/:id`
- **Ports**: `GET /api/ports`, `POST /api/ports`
- **Crew**: `GET /api/crew`, `POST /api/crew`, `PUT /api/crew/:id`, `DELETE /api/crew/:id`
- **Alerts**: `GET /api/alerts`, `PATCH /api/alerts/:id/resolve`
- **Users**: `GET /api/users` (Admin), `POST /api/users` (Admin), `PUT /api/users/:id` (Admin), `PATCH /api/users/:id/status` (Admin)
- **Reports**: `GET /api/reports/export/:type` (CSV download)
- **Admin Reset**: `POST /api/admin/reset-demo`
