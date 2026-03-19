const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'qa-system-secret-key-2024';

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./qa_system.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS centers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS quality_indicators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    centerId INTEGER NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    department TEXT NOT NULL,
    totalSpecimen INTEGER DEFAULT 0,
    totalStatSpecimen INTEGER DEFAULT 0,
    totalIQC INTEGER DEFAULT 0,
    failedIQC INTEGER DEFAULT 0,
    totalPanicResults INTEGER DEFAULT 0,
    informedPanicResults INTEGER DEFAULT 0,
    rejectedSamples INTEGER DEFAULT 0,
    hemolyzedSamples INTEGER DEFAULT 0,
    unsatisfactorySamples INTEGER DEFAULT 0,
    reagentLotVerification INTEGER DEFAULT 0,
    reagentLotShipmentVerification INTEGER DEFAULT 0,
    externalQualityAssurance TEXT,
    remarks TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (centerId) REFERENCES centers(id),
    UNIQUE(centerId, month, year, department)
  )`);

  db.run(`CREATE INDEX IF NOT EXISTS idx_qi_center ON quality_indicators(centerId)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_qi_month_year ON quality_indicators(year, month)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_qi_department ON quality_indicators(department)`);

  const regions = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Gilgit-Baltistan', 'Azad Kashmir'];
  const cities = {
    'Punjab': ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot', 'Bahawalpur', 'Sargodha'],
    'Sindh': ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana', 'Nawabshah', 'Mirpurkhas'],
    'Khyber Pakhtunkhwa': ['Peshawar', 'Mardan', 'Abbottabad', 'Swat', 'Kohat', 'Dera Ismail Khan'],
    'Balochistan': ['Quetta', 'Khuzdar', 'Hub', 'Loralai', 'Gwadar'],
    'Gilgit-Baltistan': ['Gilgit', 'Skardu', 'Hunza'],
    'Azad Kashmir': ['Muzaffarabad', 'Mirpur', 'Kotli']
  };

  db.get("SELECT COUNT(*) as count FROM centers", (err, row) => {
    if (row.count === 0) {
      const citiesList = Object.values(cities).flat();
      for (let i = 1; i <= 50; i++) {
        const city = citiesList[i % citiesList.length];
        const region = Object.keys(cities).find(r => cities[r].includes(city)) || 'Punjab';
        const name = `Diagnostic Center ${i}`;
        const username = `center${i}`;
        const password = bcrypt.hashSync('center123', 10);
        db.run("INSERT INTO centers (name, city, region, username, password) VALUES (?, ?, ?, ?, ?)", 
          [name, city, region, username, password]);
      }
      console.log('Seeded 50 diagnostic centers');
    }
  });

  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row.count === 0) {
      const adminPassword = bcrypt.hashSync('admin123', 10);
      db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ['admin', adminPassword, 'admin']);
      console.log('Seeded admin user');
    }
  });

  const departments = ['Hematology', 'Microbiology', 'Routine Chemistry', 'Special Chemistry', 'Histopathology', 'Molecular Biology', 'Blood Bank'];
  
  db.get("SELECT COUNT(*) as count FROM quality_indicators", (err, row) => {
    if (row.count === 0) {
      for (let centerId = 1; centerId <= 5; centerId++) {
        for (let m = 1; m <= 4; m++) {
          for (const dept of departments) {
            const totalSpecimen = Math.floor(Math.random() * 500) + 100;
            const totalStatSpecimen = Math.floor(Math.random() * 50) + 10;
            const totalIQC = Math.floor(Math.random() * 30) + 10;
            const failedIQC = Math.floor(Math.random() * 3);
            const totalPanicResults = Math.floor(Math.random() * 10);
            const informedPanicResults = Math.floor(Math.random() * totalPanicResults);
            const rejectedSamples = Math.floor(Math.random() * 15);
            const hemolyzedSamples = Math.floor(Math.random() * 8);
            const unsatisfactorySamples = Math.floor(Math.random() * 5);
            const reagentLotVerification = Math.floor(Math.random() * 5) + 1;
            const reagentLotShipmentVerification = Math.floor(Math.random() * 3) + 1;
            
            db.run(`INSERT INTO quality_indicators (centerId, month, year, department, totalSpecimen, totalStatSpecimen, totalIQC, failedIQC, totalPanicResults, informedPanicResults, rejectedSamples, hemolyzedSamples, unsatisfactorySamples, reagentLotVerification, reagentLotShipmentVerification, externalQualityAssurance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [centerId, m, 2026, dept, totalSpecimen, totalStatSpecimen, totalIQC, failedIQC, totalPanicResults, informedPanicResults, rejectedSamples, hemolyzedSamples, unsatisfactorySamples, reagentLotVerification, reagentLotShipmentVerification, 'Completed']);
          }
        }
      }
      console.log('Seeded quality indicators data: 5 centers x 4 months x 7 departments = 140 records');
    }
  });
});

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, role: user.role, username: user.username });
    }
    
    db.get("SELECT * FROM centers WHERE username = ?", [username], (err, center) => {
      if (center && bcrypt.compareSync(password, center.password)) {
        const token = jwt.sign({ id: center.id, username: center.username, role: 'center', centerId: center.id, centerName: center.name }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, role: 'center', username: center.username, centerName: center.name, centerId: center.id });
      }
      res.status(401).json({ error: 'Invalid credentials' });
    });
  });
});

app.get('/api/centers', authenticate, (req, res) => {
  db.all("SELECT id, name, city, region FROM centers", [], (err, rows) => {
    res.json(rows);
  });
});

app.get('/api/center/:id', authenticate, (req, res) => {
  db.get("SELECT * FROM centers WHERE id = ?", [req.params.id], (err, row) => {
    res.json(row);
  });
});

app.get('/api/quality-dashboard', authenticate, (req, res) => {
  const { month, year, centerId, department } = req.query;
  
  let monthFilter = '';
  let params = [];
  if (month && year) {
    monthFilter = ' AND month = ? AND year = ?';
    params.push(parseInt(month), parseInt(year));
  } else if (year) {
    monthFilter = ' AND year = ?';
    params.push(parseInt(year));
  }
  if (centerId) { monthFilter += ' AND centerId = ?'; params.push(parseInt(centerId)); }
  if (department) { monthFilter += ' AND department = ?'; params.push(department); }
  
  const q = (sql, p = []) => new Promise((resolve) => db.all(sql, p, (err, rows) => resolve(rows || [])));
  
  Promise.all([
    q(`SELECT COUNT(DISTINCT centerId) as centersSubmitted FROM quality_indicators WHERE 1=1${monthFilter}`, params),
    q(`SELECT COUNT(*) as total FROM quality_indicators WHERE 1=1${monthFilter}`, params),
    q(`SELECT SUM(totalSpecimen) as totalSpecimen, SUM(totalStatSpecimen) as totalStat, 
      SUM(totalIQC) as totalIQC, SUM(failedIQC) as failedIQC,
      SUM(totalPanicResults) as totalPanic, SUM(informedPanicResults) as informedPanic,
      SUM(rejectedSamples) as rejected, SUM(hemolyzedSamples) as hemolyzed
      FROM quality_indicators WHERE 1=1${monthFilter}`, params),
    q(`SELECT department, 
      SUM(totalSpecimen) as totalSpecimen, SUM(totalIQC) as totalIQC, SUM(failedIQC) as failedIQC,
      SUM(totalPanicResults) as totalPanic, SUM(informedPanicResults) as informedPanic
      FROM quality_indicators WHERE 1=1${monthFilter} GROUP BY department`, params),
    q(`SELECT month, year, 
      SUM(totalSpecimen) as totalSpecimen, SUM(totalIQC) as totalIQC, SUM(failedIQC) as failedIQC,
      SUM(totalPanicResults) as totalPanic, SUM(rejectedSamples) as rejected
      FROM quality_indicators WHERE 1=1${monthFilter} GROUP BY month, year ORDER BY year DESC, month DESC LIMIT 12`, params)
  ]).then(([totalSubmitted, totalRecords, totals, byDepartment, monthlyStats]) => {
    res.json({
      centersSubmitted: totalSubmitted[0]?.centersSubmitted || 0,
      totalRecords: totalRecords[0]?.total || 0,
      totals: totals[0] || {},
      byDepartment,
      monthlyStats: monthlyStats.reverse()
    });
  }).catch(err => res.status(500).json({ error: err.message }));
});

app.get('/api/center-comparison', authenticate, (req, res) => {
  const { centerId, year } = req.query;
  
  let filters = [];
  let params = [];
  if (centerId) { filters.push('centerId = ?'); params.push(parseInt(centerId)); }
  if (year) { filters.push('year = ?'); params.push(parseInt(year)); }
  
  const whereClause = filters.length > 0 ? ' WHERE ' + filters.join(' AND ') : '';
  
  const query = `SELECT month, year,
    SUM(totalSpecimen) as totalSpecimen,
    SUM(totalIQC) as totalIQC,
    SUM(totalPanicResults) as totalPanic,
    SUM(informedPanicResults) as informedPanic
    FROM quality_indicators${whereClause}
    GROUP BY month, year
    ORDER BY year, month`;
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/quality-indicators/:centerId', authenticate, (req, res) => {
  const { month, year } = req.query;
  let query = "SELECT * FROM quality_indicators WHERE centerId = ?";
  let params = [req.params.centerId];
  
  if (month && year) {
    query += " AND month = ? AND year = ?";
    params.push(parseInt(month), parseInt(year));
  }
  
  query += " ORDER BY year DESC, month DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/all-quality-indicators', authenticate, (req, res) => {
  const { month, year, centerId, department } = req.query;
  let query = "SELECT qi.*, c.name as centerName, c.city, c.region FROM quality_indicators qi JOIN centers c ON qi.centerId = c.id WHERE 1=1";
  let params = [];
  
  if (month) { query += " AND qi.month = ?"; params.push(parseInt(month)); }
  if (year) { query += " AND qi.year = ?"; params.push(parseInt(year)); }
  if (centerId) { query += " AND qi.centerId = ?"; params.push(parseInt(centerId)); }
  if (department) { query += " AND qi.department = ?"; params.push(department); }
  
  query += " ORDER BY qi.year DESC, qi.month DESC";
  
  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
