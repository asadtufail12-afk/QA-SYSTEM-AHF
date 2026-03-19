import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import * as XLSX from 'xlsx';

const API_URL = '/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
  };

  return (
    <BrowserRouter>
      {token ? (
        <>
          {role !== 'center' && (
            <div style={{ padding: '10px', background: '#fef3c7', color: '#92400e', textAlign: 'center' }}>
              Logged in as: <strong>{role}</strong> | <button onClick={logout} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Logout</button> to login as center
            </div>
          )}
          {role === 'admin' ? <AdminLayout logout={logout} /> : <CenterLayout logout={logout} />}
        </>
      ) : (
        <Login setToken={setToken} setRole={setRole} />
      )}
    </BrowserRouter>
  );
}

function Login({ setToken, setRole }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('centerId', data.centerId || '');
        localStorage.setItem('centerName', data.centerName || '');
        setToken(data.token);
        setRole(data.role);
        window.location.reload();
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>QA System</h1>
        <p>Pakistan Diagnostic Centers</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
        <div style={{ marginTop: 20, fontSize: '0.75rem', color: '#666' }}>
          <p>Admin: admin / admin123</p>
          <p>Centers: center1-50 / center123</p>
        </div>
      </div>
    </div>
  );
}

function AdminLayout({ logout }) {
  return (
    <div className="app">
      <div className="sidebar">
        <h2>QA Admin</h2>
        <nav>
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/quality-indicators" className="nav-link">Quality Indicators</Link>
          <Link to="/centers" className="nav-link">Centers</Link>
        </nav>
        <a href="#" className="nav-link logout" onClick={logout}>Logout</a>
      </div>
      <div className="main">
        <Routes>
          <Route path="/" element={<AdminDashboard />} />
          <Route path="/quality-indicators" element={<AllQualityIndicators />} />
          <Route path="/centers" element={<CentersList />} />
        </Routes>
      </div>
    </div>
  );
}

function CenterLayout({ logout }) {
  const centerName = localStorage.getItem('centerName');

  return (
    <div className="app">
      <div className="sidebar">
        <h2>{centerName}</h2>
        <nav>
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/submit-quality" className="nav-link">Quality Indicators</Link>
          <Link to="/history" className="nav-link">My Reports</Link>
        </nav>
        <a href="#" className="nav-link logout" onClick={logout}>Logout</a>
      </div>
      <div className="main">
        <Routes>
          <Route path="/" element={<CenterDashboard />} />
          <Route path="/submit-quality" element={<QualityIndicatorsForm />} />
          <Route path="/history" element={<MyReports />} />
        </Routes>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [centerData, setCenterData] = useState([]);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [centerId, setCenterId] = useState('');
  const [department, setDepartment] = useState('');
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    fetchCenters();
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCenterComparison();
  }, [month, year, centerId, department]);

  const fetchCenters = async () => {
    const res = await fetch(`${API_URL}/centers`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setCenters(data);
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ month, year, centerId, department });
      const res = await fetch(`${API_URL}/quality-dashboard?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchCenterComparison = async () => {
    try {
      const params = new URLSearchParams({ centerId, year });
      const res = await fetch(`${API_URL}/center-comparison?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setCenterData(data);
    } catch (err) {
      console.error('Failed to fetch center comparison:', err);
    }
  };

  if (error) return <div className="page-header"><h1>Error: {error}</h1></div>;
  if (!stats) return <div className="page-header"><h1>Loading...</h1></div>;

  const { totals = {}, byDepartment = [], monthlyStats = [], centersSubmitted = 0, totalRecords = 0 } = stats;
  
  const iqcAcceptance = totals.totalIQC > 0 ? (((totals.totalIQC - totals.failedIQC) / totals.totalIQC) * 100).toFixed(1) : 0;
  const panicNotInformed = (totals.totalPanic || 0) - (totals.informedPanic || 0);
  const panicNotInformedPercent = totals.totalPanic > 0 ? ((panicNotInformed / totals.totalPanic) * 100).toFixed(1) : 0;

  const deptData = byDepartment.map(d => ({
    name: d.department,
    iqcAcceptance: d.totalIQC > 0 ? (((d.totalIQC - d.failedIQC) / d.totalIQC) * 100).toFixed(1) : 0,
    specimen: d.totalSpecimen || 0,
    panic: d.totalPanic || 0
  }));

  const hasData = totalRecords > 0;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Quality Indicators Overview</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select value={centerId} onChange={e => setCenterId(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="">All Centers</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={department} onChange={e => setDepartment(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="">All Months</option>
            {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}>
            <option value="">All Years</option>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {!hasData && <div className="alert alert-warning">No data available for selected filter</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Records</div>
          <div className="value">{totalRecords}</div>
        </div>
        <div className="stat-card">
          <div className="label">Centers Submitted</div>
          <div className="value">{centersSubmitted}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Specimen</div>
          <div className="value">{totals.totalSpecimen || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total STAT Specimen</div>
          <div className="value">{totals.totalStat || 0}</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total IQC</div>
          <div className="value">{totals.totalIQC || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Failed IQC</div>
          <div className="value" style={{ color: (totals.failedIQC || 0) > 0 ? '#ef4444' : '#10b981' }}>{totals.failedIQC || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">% IQC Acceptance</div>
          <div className="value" style={{ color: parseFloat(iqcAcceptance) < 90 ? '#ef4444' : '#10b981' }}>{iqcAcceptance}%</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Panic Results</div>
          <div className="value">{totals.totalPanic || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Informed Panic</div>
          <div className="value">{totals.informedPanic || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Not Informed Panic</div>
          <div className="value" style={{ color: panicNotInformed > 0 ? '#ef4444' : '#10b981' }}>{panicNotInformed}</div>
        </div>
        <div className="stat-card">
          <div className="label">% Not Informed</div>
          <div className="value" style={{ color: parseFloat(panicNotInformedPercent) > 5 ? '#ef4444' : '#10b981' }}>{panicNotInformedPercent}%</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Rejected Samples</div>
          <div className="value">{totals.rejected || 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Hemolyzed Samples</div>
          <div className="value" style={{ color: (totals.hemolyzed || 0) > 0 ? '#f59e0b' : '#10b981' }}>{totals.hemolyzed || 0}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>IQC Acceptance by Department</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="iqcAcceptance" fill="#10b981" name="% Acceptance" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Specimen by Department</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="specimen" fill="#4a90a4" name="Specimen" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Monthly Specimen Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalSpecimen" stroke="#1e3a5f" name="Specimen" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Monthly IQC Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="totalIQC" stroke="#10b981" name="Total IQC" />
              <Line type="monotone" dataKey="failedIQC" stroke="#ef4444" name="Failed IQC" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ width: '100%', marginTop: '20px' }}>
        <h3>Center Performance Comparison - Month over Month</h3>
        <p style={{ fontSize: '12px', color: '#666' }}>Select a center to compare its performance across months</p>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={centerData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="totalSpecimen" stroke="#1e3a5f" name="Total Specimen" strokeWidth={2} />
            <Line type="monotone" dataKey="totalIQC" stroke="#10b981" name="Total IQC" strokeWidth={2} />
            <Line type="monotone" dataKey="totalPanic" stroke="#f59e0b" name="Total Panic" strokeWidth={2} />
            <Line type="monotone" dataKey="informedPanic" stroke="#6366f1" name="Informed Panic" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ width: '100%', overflowX: 'auto' }}>
        <h3>Month-over-Month Comparison</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Total Specimen</th>
              <th>Change</th>
              <th>Total IQC</th>
              <th>Change</th>
              <th>Total Panic</th>
              <th>Change</th>
              <th>Informed Panic</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {centerData.map((row, idx) => {
              const prev = centerData[idx - 1] || {};
              const calcChange = (curr, prev) => {
                if (!prev || prev === 0) return '-';
                const change = ((curr - prev) / prev * 100).toFixed(1);
                return change > 0 ? `+${change}%` : `${change}%`;
              };
              return (
                <tr key={`${row.year}-${row.month}`}>
                  <td>{new Date(0, row.month - 1).toLocaleString('en', { month: 'long' })} {row.year}</td>
                  <td>{row.totalSpecimen}</td>
                  <td style={{ color: row.totalSpecimen >= (prev.totalSpecimen || 0) ? '#10b981' : '#ef4444' }}>{calcChange(row.totalSpecimen, prev.totalSpecimen)}</td>
                  <td>{row.totalIQC}</td>
                  <td style={{ color: row.totalIQC >= (prev.totalIQC || 0) ? '#10b981' : '#ef4444' }}>{calcChange(row.totalIQC, prev.totalIQC)}</td>
                  <td>{row.totalPanic}</td>
                  <td style={{ color: row.totalPanic <= (prev.totalPanic || 0) ? '#10b981' : '#ef4444' }}>{calcChange(row.totalPanic, prev.totalPanic)}</td>
                  <td>{row.informedPanic}</td>
                  <td style={{ color: row.informedPanic >= (prev.informedPanic || 0) ? '#10b981' : '#ef4444' }}>{calcChange(row.informedPanic, prev.informedPanic)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: '#666', marginTop: '10px' }}>
          <span style={{ color: '#10b981' }}>Green</span> = Improvement | <span style={{ color: '#ef4444' }}>Red</span> = Decline
        </p>
      </div>
    </div>
  );
}

function AllReports() {
  const [reports, setReports] = useState({ equipment: [], personnel: [] });
  const [filter, setFilter] = useState({ month: '', year: '', centerId: '' });
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchCenters();
  }, [filter]);

  const fetchReports = async () => {
    const params = new URLSearchParams(filter);
    const res = await fetch(`${API_URL}/all-reports?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setReports(data);
  };

  const fetchCenters = async () => {
    const res = await fetch(`${API_URL}/centers`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setCenters(data);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const eqData = reports.equipment.map(r => ({
      Center: r.centerName,
      City: r.city,
      Region: r.region,
      Month: r.month,
      Year: r.year,
      Equipment: r.equipmentName,
      Status: r.status,
      Accuracy: r.accuracyPercentage,
      LastCalibration: r.lastCalibrationDate,
      NextCalibration: r.nextCalibrationDue,
      Incidents: r.incidentsReported,
      Remarks: r.remarks
    }));
    
    const perData = reports.personnel.map(r => ({
      Center: r.centerName,
      City: r.city,
      Region: r.region,
      Month: r.month,
      Year: r.year,
      TotalStaff: r.totalStaff,
      CertifiedStaff: r.certifiedStaff,
      TrainingConducted: r.trainingConducted,
      CompetencyScore: r.competencyScore,
      CertificationsValid: r.certificationsValid,
      StaffTurnover: r.staffTurnover,
      Remarks: r.remarks
    }));

    if (eqData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eqData), 'Equipment');
    if (perData.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(perData), 'Personnel');
    
    XLSX.writeFile(wb, 'QA_Reports.xlsx');
  };

  return (
    <div>
      <div className="page-header">
        <h1>All Reports</h1>
        <p>View and export all center submissions</p>
      </div>

      <div className="filters">
        <select value={filter.month} onChange={e => setFilter({ ...filter, month: e.target.value })}>
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
        </select>
        <select value={filter.year} onChange={e => setFilter({ ...filter, year: e.target.value })}>
          <option value="">All Years</option>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filter.centerId} onChange={e => setFilter({ ...filter, centerId: e.target.value })}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-accent" onClick={exportToExcel}>Export Excel</button>
      </div>

      <div className="card">
        <h3>Equipment Reports ({reports.equipment.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Center</th>
                <th>Equipment</th>
                <th>Status</th>
                <th>Accuracy</th>
                <th>Month</th>
              </tr>
            </thead>
            <tbody>
              {reports.equipment.map(r => (
                <tr key={r.id}>
                  <td>{r.centerName}</td>
                  <td>{r.equipmentName}</td>
                  <td><span className={`status-badge status-${r.status?.replace(/ /g, '-')}`}>{r.status}</span></td>
                  <td>{r.accuracyPercentage}%</td>
                  <td>{r.month}/{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3>Personnel Reports ({reports.personnel.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Center</th>
                <th>Total Staff</th>
                <th>Certified</th>
                <th>Competency</th>
                <th>Training</th>
                <th>Month</th>
              </tr>
            </thead>
            <tbody>
              {reports.personnel.map(r => (
                <tr key={r.id}>
                  <td>{r.centerName}</td>
                  <td>{r.totalStaff}</td>
                  <td>{r.certifiedStaff}</td>
                  <td>{r.competencyScore}</td>
                  <td>{r.trainingConducted}</td>
                  <td>{r.month}/{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CentersList() {
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/centers`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(setCenters);
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Diagnostic Centers</h1>
        <p>All 50 diagnostic centers across Pakistan</p>
      </div>
      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>City</th>
                <th>Region</th>
              </tr>
            </thead>
            <tbody>
              {centers.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.city}</td>
                  <td>{c.region}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CenterDashboard() {
  const centerId = localStorage.getItem('centerId');
  const centerName = localStorage.getItem('centerName');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const now = new Date();
    fetch(`${API_URL}/quality-indicators/${centerId}?month=${now.getMonth()+1}&year=${now.getFullYear()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(qiData => {
      setSubmitted(qiData.length > 0);
    });
  }, [centerId]);

  return (
    <div>
      <div className="page-header">
        <h1>Welcome, {centerName}</h1>
        <p>Submit your monthly QA reports</p>
      </div>

      {submitted ? (
        <div className="alert alert-success">You have already submitted your QA report for this month.</div>
      ) : (
        <div className="alert alert-warning">Please submit your monthly QA report.</div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Status</div>
          <div className="value" style={{ color: submitted ? '#10b981' : '#f59e0b' }}>
            {submitted ? 'Submitted' : 'Pending'}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/submit-quality" className="btn btn-primary">Submit Quality Indicators</Link>
          <Link to="/history" className="btn btn-outline">View History</Link>
        </div>
      </div>
    </div>
  );
}

const DEPARTMENTS = [
  'Hematology',
  'Microbiology',
  'Routine Chemistry',
  'Special Chemistry',
  'Histopathology',
  'Molecular Biology',
  'Blood Bank'
];

function QualityIndicatorsForm() {
  const centerId = localStorage.getItem('centerId');
  console.log('Center ID:', centerId);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [department, setDepartment] = useState('Hematology');
  const [form, setForm] = useState({
    totalSpecimen: 0,
    totalStatSpecimen: 0,
    totalIQC: 0,
    failedIQC: 0,
    totalPanicResults: 0,
    informedPanicResults: 0,
    rejectedSamples: 0,
    hemolyzedSamples: 0,
    unsatisfactorySamples: 0,
    reagentLotVerification: 0,
    reagentLotShipmentVerification: 0,
    externalQualityAssurance: '',
    remarks: ''
  });

  const handleSubmit = async () => {
    console.log('Submitting:', { centerId, month, year, department, ...form });
    try {
      const res = await fetch(`${API_URL}/quality-indicators`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ centerId, month, year, department, ...form })
      });
      const data = await res.json();
      console.log('Response:', res.status, data);
      if (res.ok) {
        alert('Quality Indicators submitted successfully!');
      } else {
        alert('Error: ' + (data.error || 'Failed to submit'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error: ' + err.message);
    }
  };

  const notInformedPanic = form.totalPanicResults - form.informedPanicResults;
  const iqcAcceptance = form.totalIQC > 0 ? (((form.totalIQC - form.failedIQC) / form.totalIQC) * 100).toFixed(1) : 0;
  const notInformedPanicPercent = form.totalPanicResults > 0 ? ((notInformedPanic / form.totalPanicResults) * 100).toFixed(1) : 0;

  return (
    <div>
      <div className="page-header">
        <h1>Quality Indicators</h1>
        <p>Submit monthly quality indicator data</p>
      </div>

      <div className="card">
        <div className="form-row">
          <div className="form-group">
            <label>Month</label>
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Year</label>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Specimen Data</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Total Number of Specimen</label>
            <input type="number" min="0" value={form.totalSpecimen} 
              onChange={e => setForm({ ...form, totalSpecimen: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total STAT Specimen</label>
            <input type="number" min="0" value={form.totalStatSpecimen} 
              onChange={e => setForm({ ...form, totalStatSpecimen: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Internal Quality Control (IQC)</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Total Number of IQC</label>
            <input type="number" min="0" value={form.totalIQC} 
              onChange={e => setForm({ ...form, totalIQC: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Number of Failed IQC</label>
            <input type="number" min="0" value={form.failedIQC} 
              onChange={e => setForm({ ...form, failedIQC: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>% of Acceptance of IQC</label>
            <input type="text" value={iqcAcceptance + '%'} readOnly />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Panic Results</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Total Number of Panic Results</label>
            <input type="number" min="0" value={form.totalPanicResults} 
              onChange={e => setForm({ ...form, totalPanicResults: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Number of Informed Panic Results</label>
            <input type="number" min="0" value={form.informedPanicResults} 
              onChange={e => setForm({ ...form, informedPanicResults: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Total Number of Not Informed Panic Results</label>
            <input type="text" value={notInformedPanic} readOnly />
          </div>
          <div className="form-group">
            <label>% of Not Informed Panic Results</label>
            <input type="text" value={notInformedPanicPercent + '%'} readOnly />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Sample Rejection</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Total Number of Rejected Samples</label>
            <input type="number" min="0" value={form.rejectedSamples} 
              onChange={e => setForm({ ...form, rejectedSamples: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Number of Hemolyzed Samples</label>
            <input type="number" min="0" value={form.hemolyzedSamples} 
              onChange={e => setForm({ ...form, hemolyzedSamples: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Number of Unsatisfactory Samples</label>
            <input type="number" min="0" value={form.unsatisfactorySamples} 
              onChange={e => setForm({ ...form, unsatisfactorySamples: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Reagent & External Quality Assurance</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Total Number of Reagent Lot Verification</label>
            <input type="number" min="0" value={form.reagentLotVerification} 
              onChange={e => setForm({ ...form, reagentLotVerification: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label>Total Number of Reagent Lot Shipment Verification</label>
            <input type="number" min="0" value={form.reagentLotShipmentVerification} 
              onChange={e => setForm({ ...form, reagentLotShipmentVerification: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="form-group">
          <label>External Quality Assurance</label>
          <textarea rows={2} value={form.externalQualityAssurance} 
            onChange={e => setForm({ ...form, externalQualityAssurance: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Remarks</label>
          <textarea rows={2} value={form.remarks} 
            onChange={e => setForm({ ...form, remarks: e.target.value })} />
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSubmit}>Submit Quality Indicators</button>
    </div>
  );
}

function MyReports() {
  const centerId = localStorage.getItem('centerId');
  const [qualityIndicators, setQualityIndicators] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/quality-indicators/${centerId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(res => res.json()).then(setQualityIndicators);
  }, [centerId]);

  return (
    <div>
      <div className="page-header">
        <h1>My Reports</h1>
        <p>View your submission history</p>
      </div>

      <div className="card">
        <h3>Quality Indicators</h3>
        {qualityIndicators.length === 0 ? (
          <p className="empty-state">No quality indicators submitted yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Specimen</th>
                  <th>STAT</th>
                  <th>IQC</th>
                  <th>Failed</th>
                  <th>Panic</th>
                  <th>Informed</th>
                  <th>Rejected</th>
                  <th>Month/Year</th>
                </tr>
              </thead>
              <tbody>
                {qualityIndicators.map(r => (
                  <tr key={r.id}>
                    <td>{r.department}</td>
                    <td>{r.totalSpecimen}</td>
                    <td>{r.totalStatSpecimen}</td>
                    <td>{r.totalIQC}</td>
                    <td>{r.failedIQC}</td>
                    <td>{r.totalPanicResults}</td>
                    <td>{r.informedPanicResults}</td>
                    <td>{r.rejectedSamples}</td>
                    <td>{r.month}/{r.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AllQualityIndicators() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState({ month: '', year: '', centerId: '', department: '' });
  const [centers, setCenters] = useState([]);

  useEffect(() => {
    fetchReports();
    fetchCenters();
  }, [filter]);

  const fetchReports = async () => {
    const params = new URLSearchParams(filter);
    const res = await fetch(`${API_URL}/all-quality-indicators?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setReports(data);
  };

  const fetchCenters = async () => {
    const res = await fetch(`${API_URL}/centers`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    setCenters(data);
  };

  const calculateIQCAcceptance = (r) => {
    if (!r.totalIQC || r.totalIQC === 0) return 'N/A';
    return (((r.totalIQC - r.failedIQC) / r.totalIQC) * 100).toFixed(1) + '%';
  };

  const calculateNotInformedPanic = (r) => {
    return (r.totalPanicResults || 0) - (r.informedPanicResults || 0);
  };

  const calculateNotInformedPanicPercent = (r) => {
    if (!r.totalPanicResults || r.totalPanicResults === 0) return 'N/A';
    return ((calculateNotInformedPanic(r) / r.totalPanicResults) * 100).toFixed(1) + '%';
  };

  const getMonthName = (m) => new Date(0, m - 1).toLocaleString('en', { month: 'long' });

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const data = reports.map(r => ({
      Center: r.centerName,
      Department: r.department,
      City: r.city,
      Region: r.region,
      Month: getMonthName(r.month),
      Year: r.year,
      'Total Specimen': r.totalSpecimen,
      'Total STAT Specimen': r.totalStatSpecimen,
      'Total IQC': r.totalIQC,
      'Failed IQC': r.failedIQC,
      '% IQC Acceptance': calculateIQCAcceptance(r),
      'Panic Results': r.totalPanicResults,
      'Informed Panic': r.informedPanicResults,
      'Not Informed Panic': calculateNotInformedPanic(r),
      '% Not Informed Panic': calculateNotInformedPanicPercent(r),
      'Rejected Samples': r.rejectedSamples,
      'Hemolyzed Samples': r.hemolyzedSamples,
      'Unsatisfactory Samples': r.unsatisfactorySamples,
      'Reagent Lot Verification': r.reagentLotVerification,
      'Reagent Lot Shipment Verification': r.reagentLotShipmentVerification,
      'External QA': r.externalQualityAssurance,
      Remarks: r.remarks
    }));
    
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Quality Indicators');
    XLSX.writeFile(wb, 'Quality_Indicators.xlsx');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Quality Indicators</h1>
        <p>View and export quality indicator data</p>
      </div>

      <div className="filters">
        <select value={filter.month} onChange={e => setFilter({ ...filter, month: e.target.value })}>
          <option value="">All Months</option>
          {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>)}
        </select>
        <select value={filter.year} onChange={e => setFilter({ ...filter, year: e.target.value })}>
          <option value="">All Years</option>
          {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filter.department} onChange={e => setFilter({ ...filter, department: e.target.value })}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={filter.centerId} onChange={e => setFilter({ ...filter, centerId: e.target.value })}>
          <option value="">All Centers</option>
          {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-accent" onClick={exportToExcel}>Export Excel</button>
      </div>

      <div className="card">
        <h3>Quality Indicators ({reports.length})</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Center</th>
                <th>Month</th>
                <th>Department</th>
                <th>Specimen</th>
                <th>STAT</th>
                <th>IQC</th>
                <th>Failed</th>
                <th>% Accept</th>
                <th>Panic</th>
                <th>Informed</th>
                <th>% Not Inf</th>
                <th>Rejected</th>
                <th>Hemolyzed</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id}>
                  <td>{r.centerName}</td>
                  <td>{getMonthName(r.month)} {r.year}</td>
                  <td>{r.department}</td>
                  <td>{r.totalSpecimen}</td>
                  <td>{r.totalStatSpecimen}</td>
                  <td>{r.totalIQC}</td>
                  <td>{r.failedIQC}</td>
                  <td>{calculateIQCAcceptance(r)}</td>
                  <td>{r.totalPanicResults}</td>
                  <td>{r.informedPanicResults}</td>
                  <td>{calculateNotInformedPanicPercent(r)}</td>
                  <td>{r.rejectedSamples}</td>
                  <td>{r.hemolyzedSamples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
