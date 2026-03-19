# QA Data Collection System - Specification

## Project Overview
- **Project Name**: Pakistan Diagnostic Centers QA System
- **Type**: Full-stack Web Application
- **Core Functionality**: Monthly QA data collection from 50 diagnostic centers across Pakistan
- **Target Users**: Diagnostic center staff, QA administrators

## Technology Stack
- **Frontend**: React 18 with Vite
- **Backend**: Node.js + Express
- **Database**: SQLite (simple, portable)
- **Charts**: Recharts
- **Export**: xlsx library

## Data Models

### Center
- id, name, city, region, username, password (hashed)

### QAReport (Equipment)
- id, centerId, month, year
- equipmentName, status (operational/needs-maintenance/out-of-service)
- lastCalibrationDate, nextCalibrationDue
- accuracyPercentage
- incidentsReported
- remarks

### QAReport (Personnel)
- id, centerId, month, year
- totalStaff, certifiedStaff
- trainingConducted (yes/no)
- competencyScore (0-100)
- certificationsValid (yes/no)
- staffTurnover

## UI/UX Specification

### Color Palette
- Primary: #1e3a5f (Deep blue)
- Secondary: #4a90a4 (Teal)
- Accent: #f59e0b (Amber)
- Success: #10b981
- Warning: #f59e0b
- Error: #ef4444
- Background: #f8fafc
- Card: #ffffff

### Typography
- Font: Inter, system-ui
- Headings: 700 weight
- Body: 400 weight

### Layout
- Sidebar navigation (collapsible on mobile)
- Responsive cards
- Data tables with pagination

## Pages

### 1. Login Page
- Center login (username/password)
- Admin login (separate credentials)
- Remember me option

### 2. Center Dashboard
- Welcome message with center name
- Current month status (submitted/not submitted)
- Submit QA Report button
- View past submissions

### 3. QA Report Form (Equipment)
- Month/Year selector
- Equipment list with status dropdowns
- Calibration dates
- Accuracy percentage slider
- Incidents text area
- Submit button

### 4. QA Report Form (Personnel)
- Staff counts
- Training checkbox
- Competency score
- Certification status
- Submit button

### 5. Admin Dashboard
- Total centers summary
- Submission status by month
- Charts:
  - Equipment status pie chart
  - Monthly submissions bar chart
  - Regional distribution
  - Personnel competency trends

### 6. Admin Data View
- Table of all submissions
- Filter by center, month, year
- Export to Excel button

## Authentication
- JWT tokens
- Admin: username "admin", password "admin123"
- Centers: pre-seeded 50 centers with credentials center1-center50, password "center123"

## Acceptance Criteria
1. Users can log in as admin or center
2. Centers can submit equipment and personnel QA data monthly
3. Admin can view all submissions in table format
4. Admin can see visualizations/charts
5. Data can be exported to Excel
6. Each center can only submit once per month
7. Application is responsive
