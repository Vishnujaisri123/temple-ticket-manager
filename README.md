# 🕌 Temple Ticket Manager System

A full-stack web application to manage temple ticket bookings for **Sri Venkateswara Swami Temple, Vadapalli**.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)

---

## 📌 Features

- 🔐 **JWT Authentication** — Secure admin login & account creation
- 📋 **Booking Dashboard** — Add, edit, delete bookings with inline editing
- 📎 **PDF Upload** — Drag & drop ticket PDF upload with local storage & Cloudinary support
- 📱 **WhatsApp Send** — Send ticket PDF link directly to any number via WhatsApp (no API needed)
- 🔔 **Reminder System** — Send visit reminders via WhatsApp with full booking details
- 📜 **History Page** — Completed+Paid bookings and Sent Tickets tracked separately
- 🏛️ **Gothram Autocomplete** — 130+ gothram names with smart search
- 🗑️ **Auto Delete** — Cron job deletes past visit date bookings at midnight
- 📊 **Stats Bar** — Live counts for Total, Paid, Sent, Completed
- 🔍 **Filters & Sort** — Filter by Paid/Unpaid/Sent/Pending/Reminders, sort by visit date

---

## 🗂️ Project Structure

```
Ticket Manager System/
├── backend/
│   ├── config/          # Database & Cloudinary config
│   ├── controllers/     # Auth & Booking controllers
│   ├── middleware/      # JWT auth middleware
│   ├── models/          # Booking & Admin schemas
│   ├── routes/          # API routes
│   ├── services/        # Cron scheduler
│   ├── uploads/         # Local PDF storage
│   ├── .env.example
│   └── server.js
└── frontend/
    └── src/
        ├── components/  # BookingTable, UploadCell, SendButton, GothramInput, Toast
        ├── context/     # AuthContext
        ├── pages/       # Dashboard, Login, History
        └── services/    # Axios API service
```

---

## ⚙️ Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Cloudinary account (free tier)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/temple-ticket-manager.git
cd temple-ticket-manager
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Create Admin Account
Open `http://localhost:5173` → click **Create Account** tab → register your admin credentials.

---

## 🔑 Environment Variables

Create `backend/.env` with the following:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/temple_tickets
JWT_SECRET=your_strong_secret_here
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> Cloudinary is optional — PDFs are stored locally if Cloudinary is not configured.

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Admin login |
| POST | `/api/auth/register` | ❌ | Create admin account |
| GET | `/api/bookings` | ✅ | Get bookings (with filters) |
| POST | `/api/bookings` | ✅ | Create booking |
| PUT | `/api/bookings/:id` | ✅ | Update booking |
| DELETE | `/api/bookings/:id` | ✅ | Delete booking |
| POST | `/api/bookings/upload` | ✅ | Upload PDF |

### Filter Query Params
```
?status=paid | unpaid | sent | pending | reminder | history_completed
?sort=asc | desc
```

---

## 📱 WhatsApp Integration

No WhatsApp API or Business account needed. Uses the official `https://api.whatsapp.com/send?phone=` link which:
- Opens WhatsApp Web on desktop directly to the contact's chat
- Opens WhatsApp app on mobile
- Works for **unsaved numbers**
- Pre-fills the message with booking details + PDF link

---

## 📜 Booking Flow

```
New Booking → Dashboard
     ↓ (both ✅ Done + 💰 Paid checked)
History → Completed & Paid tab
     ↓ (Send button clicked)
History → Sent Tickets tab  (with timestamp)
```

---

## 🚀 Deployment

### Backend (Render / Railway / EC2)
```bash
# Set all environment variables on your hosting platform
npm start
```

### Frontend (Vercel / Netlify)
```bash
npm run build
# Deploy the dist/ folder
# Set VITE_API_URL to your deployed backend URL
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, CSS Variables |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| File Storage | Cloudinary + Local fallback |
| Scheduler | node-cron |
| WhatsApp | wa.me / api.whatsapp.com |

---

## 📄 License

MIT License — free to use and modify.
