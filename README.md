# Pakistan Diagnostic Centers QA System

A full-stack web application for collecting monthly Quality Assurance data from 50 diagnostic centers across Pakistan.

## Features

- **Multi-role Login**: Admin and Center (50 diagnostic centers)
- **Equipment QA Forms**: Submit monthly equipment status, calibration, accuracy
- **Personnel QA Forms**: Submit staff certification, training, competency scores
- **Admin Dashboard**: Visual charts showing equipment status, regional distribution, monthly trends
- **Export Reports**: Export all data to Excel
- **50 Pre-seeded Centers**: Located across Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Gilgit-Baltistan, and Azad Kashmir

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Charts**: Recharts
- **Export**: xlsx

## Running the Application

### Option 1: Run the batch file
```bash
start.bat
```

### Option 2: Manual

1. Start the backend:
```bash
cd qa-system/server
npm install
node server.js
```

2. Start the frontend (in a new terminal):
```bash
cd qa-system/client
npm install
npm run dev
```

## Login Credentials

- **Admin**: `admin` / `admin123`
- **Centers**: `center1` to `center50` / `center123`

## API Endpoints

- `POST /api/login` - User authentication
- `GET /api/centers` - List all centers (admin)
- `GET /api/center/:id` - Get center details
- `GET /api/my-reports/:centerId` - Get center's reports
- `POST /api/equipment-report` - Submit equipment QA
- `POST /api/personnel-report` - Submit personnel QA
- `GET /api/all-reports` - Get all reports (admin)
- `GET /api/dashboard-stats` - Get dashboard statistics (admin)

## Project Structure

```
qa-system/
├── server/
│   ├── package.json
│   └── server.js          # Express API server
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx        # React components
│       └── index.css      # Styles
├── SPEC.md                # Specification document
└── start.bat              # Quick start script
```
