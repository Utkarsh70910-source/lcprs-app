# Local Community Problem Reporting System

A full-stack community issue reporting platform built with React, Node.js, MongoDB, and Socket.io.

## 🚀 Quick Start

### 1. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure environment

Edit **`server/.env`** and fill in your credentials:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Random secret key for access tokens |
| `JWT_REFRESH_SECRET` | Random secret key for refresh tokens |
| `CLOUDINARY_*` | Your [Cloudinary](https://cloudinary.com) credentials |
| `SMTP_*` | Gmail/SMTP credentials for email notifications |
| `CLIENT_URL` | Frontend URL (default: `http://localhost:3000`) |

### 3. Run the application

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🏗️ Project Structure

```
├── server/
│   ├── index.js              # Entry point
│   ├── models/
│   │   ├── User.js           # User schema
│   │   ├── Report.js         # Report schema (GeoJSON)
│   │   ├── Message.js        # Chat messages
│   │   └── Notification.js   # Notifications
│   ├── middleware/
│   │   └── auth.js           # JWT authenticate + authorize
│   ├── routes/
│   │   ├── auth.js           # Register, login, refresh, logout
│   │   ├── reports.js        # CRUD + status + assign + upvote
│   │   ├── chat.js           # Message history + send + seen
│   │   ├── analytics.js      # Overview, trends, heatmap
│   │   ├── upload.js         # Cloudinary image upload
│   │   └── users.js          # User management (admin)
│   └── services/
│       ├── emailService.js   # Nodemailer HTML emails
│       └── socketService.js  # Socket.io rooms + events
│
└── client/src/
    ├── App.js                # Routes + ProtectedRoute guards
    ├── index.css             # Global dark design system
    ├── context/
    │   └── AuthContext.js    # Auth state + axios interceptors
    ├── pages/
    │   ├── Login.js
    │   ├── Register.js
    │   ├── Dashboard.js      # Report list + filters
    │   ├── SubmitReport.js   # 3-step wizard + map + upload
    │   ├── ReportDetail.js   # Detail + chat + status history
    │   ├── AdminPanel.js     # Reports + Users management
    │   └── Analytics.js      # Charts + heatmap
    └── components/
        ├── Navbar.js         # Role-aware + notifications
        ├── ReportCard.js     # Card with image/badge/upvote
        ├── MapPicker.js      # Leaflet click-to-pin
        ├── ChatBox.js        # Socket.io real-time chat
        ├── StatusBadge.js    # Colored status/priority badge
        ├── AnalyticsCharts.js# Recharts bar + line
        └── ProtectedRoute.js # Role-based auth guard
```

## 👥 User Roles

| Role | Capabilities |
|---|---|
| **Citizen** | Submit reports, view own reports, upvote, chat |
| **Staff** | View assigned reports, update status, chat |
| **Admin** | Full access: all reports, assign staff, analytics, delete, user roles |

## 🔌 Socket.io Events

**Server → Client:**
- `new_report` — new report submitted (admins room)
- `report_updated` — status changed (report room)
- `new_message` — chat message (report room)
- `notification` — personal notification (user room)
- `user_typing` / `user_stop_typing` — typing indicators

**Client → Server:**
- `join_report_room` / `leave_report_room`
- `send_message` — send chat message
- `typing` / `stop_typing`
