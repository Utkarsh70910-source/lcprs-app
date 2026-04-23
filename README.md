# CivicAlert — Local Community Problem Reporting System

A fully responsive, full-stack web application designed to help citizens report, track, and resolve neighborhood issues. Built with the MERN stack (MongoDB, Express, React, Node.js) and supercharged with real-time Socket.io communication.

![Responsive Design](https://img.shields.io/badge/Responsive-Mobile%20Ready-brightgreen)
![React](https://img.shields.io/badge/Frontend-React.js-blue)
![Node](https://img.shields.io/badge/Backend-Node.js-green)
![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Atlas-success)

## 🌐 Live Demo
The application is currently live! 
**Frontend (Vercel):** [https://lcprs-app.vercel.app](https://lcprs-app.vercel.app)
*(Backend API is hosted on Render)*

---

## ✨ Key Features
- **Role-Based Access Control:** Distinct dashboards for Citizens, Staff, and Administrators.
- **Interactive Maps:** Click-to-pin location tracking using Leaflet.js maps.
- **Real-Time Updates:** Socket.io powered live notifications and real-time chat on every report.
- **Media Uploads:** Seamless image uploads and hosting powered by Cloudinary.
- **Analytics Dashboard:** Visual breakdowns of report statuses, categories, and resolution times using Recharts.
- **Fully Responsive:** Completely mobile-friendly design across all devices.

---

## 🚀 Local Development Setup

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

Create a `.env` file in the **`backend`** folder:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Random secret key for access tokens |
| `JWT_REFRESH_SECRET` | Random secret key for refresh tokens |
| `CLOUDINARY_*` | Cloudinary API keys (cloud_name, api_key, api_secret) |
| `SMTP_*` | Nodemailer/SMTP credentials for email notifications |
| `CLIENT_URL` | Frontend URL (default: `http://localhost:3000` locally, or Vercel URL in prod) |

Create a `.env` file in the **`frontend`** folder:
| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Backend API URL (default: `http://localhost:5000/api`) |
| `REACT_APP_SOCKET_URL` | Socket.io server URL (default: `http://localhost:5000`) |

### 3. Run the application

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 🚢 Deployment Guide

This project is configured for cloud deployment.
1. **Backend (Render):** Connect the GitHub repository to Render as a Web Service. Set the Build Command to `npm install` and the Start Command to `node index.js`. Add all environment variables (including `CLIENT_URL` pointing to the Vercel app).
2. **Frontend (Vercel):** Connect the GitHub repository to Vercel. Set the Root Directory to `frontend`. Add `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` environment variables pointing to the Render backend URL. Ensure `CI=false` is set in Vercel to ignore warning-level build failures.

---

## 👥 User Roles

| Role | Capabilities |
|---|---|
| **Citizen** | Submit reports, view own reports, upvote, chat on own reports. |
| **Staff** | View assigned reports, update report status, chat with citizens. |
| **Admin** | Full system access. Assign staff to reports, view global analytics, delete reports, and manage user roles (promote users to staff/admin). |

---

## 🔌 Real-Time Events (Socket.io)

**Server → Client:**
- `new_report` — alerts admins/staff of new submissions
- `report_updated` — status updates for the reporter
- `new_message` — live chat message delivery
- `notification` — global notification badge alerts

**Client → Server:**
- `join_report_room` — establishes a secure room for a specific report
- `send_message` — sends a chat message into the room
